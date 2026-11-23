package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ReauthenticationRequiredException;
import de.tantive.groceries.ports.in.DeleteAccountCommand;
import de.tantive.groceries.ports.in.DeleteAccountUseCase;
import de.tantive.groceries.ports.in.RetryIdpDeletionsUseCase;
import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Account deletion against a real PostgreSQL (DP-TEST-01, FR-SET-04, BR-04): what stays, what goes, who loses their
 * sessions, and the race of the last two members. The identity provider is a double; its adapter has its own test.
 */
@Tag("cross-user")
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class DeleteAccountIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    DeleteAccountUseCase deleteAccount;

    @Autowired
    RetryIdpDeletionsUseCase retry;

    @Autowired
    JdbcClient jdbc;

    @MockitoBean
    IdentityProviderPort identityProvider;

    @BeforeEach
    void identityProviderWorks() {
        reset(identityProvider);
    }

    private Caller caller(UUID id) {
        return new Caller(id, "sub-" + id, id + "@example.test", "Test");
    }

    private DeleteAccountCommand fresh(UUID id) {
        return new DeleteAccountCommand(caller(id), Instant.now().minusSeconds(10));
    }

    private long count(String sql, Object... params) {
        return jdbc.sql(sql).params(params).query(Long.class).single();
    }

    private void session(String sessionId, UUID user) {
        long now = System.currentTimeMillis();
        jdbc.sql("""
                        insert into spring_session (primary_id, session_id, creation_time, last_access_time,
                            max_inactive_interval, expiry_time, principal_name)
                        values (?, ?, ?, ?, 1800, ?, ?)
                        """)
                .params(UUID.randomUUID().toString(), sessionId, now, now, now + 1_800_000, "sub-" + user)
                .update();
        jdbc.sql("insert into idp_sessions (session_id, sid, subject, recorded_at) values (?, ?, ?, ?)")
                .params(sessionId, "sid-" + sessionId, "sub-" + user, Timestamp.from(NOW))
                .update();
    }

    @Test
    void theRemainingMemberKeepsTheSharedListWithItsItemsAndTheLastMemberListsAreGone() throws Exception {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID shared = Arrange.list(jdbc, alice, "Gemeinsam", NOW);
        Arrange.join(jdbc, bob, shared, NOW);
        Arrange.item(jdbc, shared, "Milch", false, NOW);
        UUID alone = Arrange.list(jdbc, alice, "Nur ich", NOW);
        Arrange.item(jdbc, alone, "Brot", false, NOW);

        deleteAccount.deleteAccount(fresh(alice));

        assertThat(count("select count(*) from users where id = ?", alice)).isZero();
        assertThat(count("select count(*) from memberships where user_id = ?", alice))
                .isZero();
        assertThat(count("select count(*) from lists where id = ?", alone)).isZero();
        assertThat(count("select count(*) from items where list_id = ?", alone)).isZero();
        // FR-SET-04 AC3: items in lists that remain stay; the list stays for Bob, without a creator (BR-02)
        assertThat(count("select count(*) from lists where id = ?", shared)).isOne();
        assertThat(count("select count(*) from items where list_id = ?", shared))
                .isOne();
        assertThat(count("select count(*) from memberships where list_id = ? and user_id = ?", shared, bob))
                .isOne();
        assertThat(count("select count(*) from lists where id = ? and created_by is null", shared))
                .isOne();
        org.mockito.Mockito.verify(identityProvider).deleteUser("sub-" + alice);
    }

    @Test
    void anotherPersonsAccountAndListsAreUntouched() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID bobs = Arrange.list(jdbc, bob, "Bobs", NOW);
        Arrange.item(jdbc, bobs, "Eier", false, NOW);

        deleteAccount.deleteAccount(fresh(alice));

        assertThat(count("select count(*) from users where id = ?", bob)).isOne();
        assertThat(count("select count(*) from lists where id = ?", bobs)).isOne();
        assertThat(count("select count(*) from items where list_id = ?", bobs)).isOne();
    }

    @Test
    void everySessionOfTheDeletedPersonEndsAndNobodyElsesDoes() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        String phone = UUID.randomUUID().toString();
        String laptop = UUID.randomUUID().toString();
        String bobs = UUID.randomUUID().toString();
        session(phone, alice);
        session(laptop, alice);
        session(bobs, bob);

        deleteAccount.deleteAccount(fresh(alice));

        assertThat(count("select count(*) from spring_session where session_id in (?, ?)", phone, laptop))
                .isZero();
        assertThat(count("select count(*) from idp_sessions where subject = ?", "sub-" + alice))
                .isZero();
        assertThat(count("select count(*) from spring_session where session_id = ?", bobs))
                .isOne();
    }

    @Test
    void withoutAFreshLoginNothingIsDeleted() {
        UUID alice = Arrange.user(jdbc);
        Arrange.list(jdbc, alice, "Meine", NOW);

        assertThatThrownBy(() -> deleteAccount.deleteAccount(
                        new DeleteAccountCommand(caller(alice), Instant.now().minusSeconds(6 * 60))))
                .isInstanceOf(ReauthenticationRequiredException.class);
        assertThatThrownBy(() -> deleteAccount.deleteAccount(new DeleteAccountCommand(caller(alice), null)))
                .isInstanceOf(ReauthenticationRequiredException.class);

        assertThat(count("select count(*) from users where id = ?", alice)).isOne();
        assertThat(count("select count(*) from memberships where user_id = ?", alice))
                .isOne();
    }

    @Test
    void theAccountIsGoneEvenIfTheIdentityProviderIsDownAndTheRetryFinishesIt() throws Exception {
        UUID alice = Arrange.user(jdbc);
        doThrow(new IdentityProviderUnavailableException("down"))
                .when(identityProvider)
                .deleteUser(any());

        deleteAccount.deleteAccount(fresh(alice));

        assertThat(count("select count(*) from users where id = ?", alice)).isZero();
        assertThat(count("select count(*) from pending_idp_deletions where idp_subject = ?", "sub-" + alice))
                .isOne();

        reset(identityProvider);
        doNothing().when(identityProvider).deleteUser(any());
        assertThat(retry.retryPendingDeletions()).isGreaterThanOrEqualTo(1);

        assertThat(count("select count(*) from pending_idp_deletions where idp_subject = ?", "sub-" + alice))
                .isZero();
        org.mockito.Mockito.verify(identityProvider, org.mockito.Mockito.atLeastOnce())
                .deleteUser("sub-" + alice);
    }

    @Test
    void twoLastMembersDeletingTheirAccountsAtOnceLeaveNoListWithoutMembers() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < 5; round++) {
                UUID alice = Arrange.user(jdbc);
                UUID bob = Arrange.user(jdbc);
                UUID list = Arrange.list(jdbc, alice, "Zu zweit " + round, NOW);
                Arrange.join(jdbc, bob, list, NOW);
                Arrange.item(jdbc, list, "Salz", false, NOW);
                CountDownLatch start = new CountDownLatch(1);
                List<Future<?>> done = List.of(
                        pool.submit(() -> {
                            start.await();
                            deleteAccount.deleteAccount(fresh(alice));
                            return null;
                        }),
                        pool.submit(() -> {
                            start.await();
                            deleteAccount.deleteAccount(fresh(bob));
                            return null;
                        }));
                start.countDown();
                for (Future<?> future : done) {
                    try {
                        future.get();
                    } catch (ExecutionException e) {
                        throw new AssertionError("a deletion failed in round " + round, e.getCause());
                    }
                }

                assertThat(count("select count(*) from lists where id = ?", list))
                        .as("the list of round %d is deleted with its last member", round)
                        .isZero();
                assertThat(count("select count(*) from items where list_id = ?", list))
                        .isZero();
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
