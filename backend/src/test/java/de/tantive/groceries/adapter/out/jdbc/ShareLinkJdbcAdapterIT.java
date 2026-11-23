package de.tantive.groceries.adapter.out.jdbc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class ShareLinkJdbcAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    ShareLinkPort links;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    TransactionTemplate tx;

    @Autowired
    PlatformTransactionManager transactionManager;

    @Test
    void aNewListHasNoTokenUntilOneIsAssigned() {
        UUID list = Arrange.list(jdbc, Arrange.user(jdbc), "WG", NOW);

        assertThat(links.tokenOf(list)).isEmpty();
    }

    @Test
    void assigningIsASetIfAbsentSoTheFirstTokenWins() {
        UUID list = Arrange.list(jdbc, Arrange.user(jdbc), "WG", NOW);
        ShareToken first = ShareToken.generate();

        tx.executeWithoutResult(status -> links.assignIfAbsent(list, first));
        tx.executeWithoutResult(status -> links.assignIfAbsent(list, ShareToken.generate()));

        assertThat(links.tokenOf(list)).contains(first);
    }

    @Test
    void replacingMakesTheOldTokenFindNothing() {
        UUID list = Arrange.list(jdbc, Arrange.user(jdbc), "Altes Wasser", NOW);
        ShareToken old = ShareToken.generate();
        ShareToken fresh = ShareToken.generate();
        tx.executeWithoutResult(status -> links.assignIfAbsent(list, old));

        tx.executeWithoutResult(status -> links.replace(list, fresh));

        assertThat(links.findByToken(old)).isEmpty();
        assertThat(links.findByToken(fresh)).hasValueSatisfying(found -> {
            assertThat(found.id()).isEqualTo(list);
            assertThat(found.name().value()).isEqualTo("Altes Wasser");
        });
    }

    @Test
    void anUnknownTokenFindsNothing() {
        assertThat(links.findByToken(ShareToken.generate())).isEmpty();
        Optional<InvitedList> locked = tx.execute(status -> links.findByTokenLocked(ShareToken.generate()));
        assertThat(locked).isEmpty();
    }

    @Test
    void twoListsCanNeverShareOneToken() {
        UUID first = Arrange.list(jdbc, Arrange.user(jdbc), "A", NOW);
        UUID second = Arrange.list(jdbc, Arrange.user(jdbc), "B", NOW);
        ShareToken token = ShareToken.generate();
        tx.executeWithoutResult(status -> links.assignIfAbsent(first, token));

        assertThatThrownBy(() -> tx.executeWithoutResult(status -> links.replace(second, token)))
                .hasMessageContaining("lists_share_token_key");
    }

    @Test
    void theDatabaseRefusesAMalformedToken() {
        UUID list = Arrange.list(jdbc, Arrange.user(jdbc), "WG", NOW);

        assertThatThrownBy(() -> jdbc.sql("update lists set share_token = 'short' where id = ?")
                        .param(list)
                        .update())
                .hasMessageContaining("lists_share_token_format");
    }

    @Test
    void theLockedReadTakesTheListRowLock() {
        UUID list = Arrange.list(jdbc, Arrange.user(jdbc), "WG", NOW);
        ShareToken token = ShareToken.generate();
        tx.executeWithoutResult(status -> links.assignIfAbsent(list, token));
        TransactionTemplate other = new TransactionTemplate(transactionManager);
        other.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);

        Optional<InvitedList> found = tx.execute(status -> {
            Optional<InvitedList> locked = links.findByTokenLocked(token);
            // a second connection cannot lock the same row while this transaction is open
            Boolean canLock = other.execute(inner -> jdbc.sql(
                            "select count(*) = 1 from (select id from lists where id = ? for update skip locked) l")
                    .param(list)
                    .query(Boolean.class)
                    .single());
            assertThat(canLock).isFalse();
            return locked;
        });

        assertThat(found).isPresent();
    }
}
