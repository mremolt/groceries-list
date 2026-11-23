package de.tantive.groceries.adapter.out.jdbc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test"
        })
@Import(TestcontainersConfiguration.class)
class MembershipJdbcAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    MembershipPort memberships;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    TransactionTemplate tx;

    @Test
    void countsTheListsOfOneUserOnly() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        Arrange.list(jdbc, alice, "A1", NOW);
        Arrange.list(jdbc, alice, "A2", NOW);
        Arrange.list(jdbc, bob, "B1", NOW);

        Integer aliceLists = tx.execute(status -> memberships.lockAndCountListsOf(alice));
        Integer bobLists = tx.execute(status -> memberships.lockAndCountListsOf(bob));

        assertThat(aliceLists).isEqualTo(2);
        assertThat(bobLists).isEqualTo(1);
    }

    @Test
    void addsAndRemovesMembersAndCountsThem() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID list = Arrange.list(jdbc, alice, "WG", NOW);

        tx.executeWithoutResult(status -> memberships.add(new Membership(bob, list, NOW.plusSeconds(5))));
        assertThat(memberships.countMembers(list)).isEqualTo(2);

        tx.executeWithoutResult(status -> memberships.remove(list, alice));
        assertThat(memberships.countMembers(list)).isEqualTo(1);
    }

    @Test
    void oneMembershipPerUserAndList() {
        UUID alice = Arrange.user(jdbc);
        UUID list = Arrange.list(jdbc, alice, "WG", NOW);

        assertThatThrownBy(() -> tx.executeWithoutResult(
                        status -> memberships.add(new Membership(alice, list, NOW.plusSeconds(1)))))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void removingAUserRemovesTheirMembershipsButNotTheList() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID list = Arrange.list(jdbc, alice, "WG", NOW);
        Arrange.join(jdbc, bob, list, NOW);

        jdbc.sql("delete from users where id = ?").param(alice).update();

        assertThat(memberships.countMembers(list)).isEqualTo(1);
        assertThat(jdbc.sql("select created_by from lists where id = ?")
                        .param(list)
                        .query(UUID.class)
                        .optional())
                .isEmpty(); // the informational creator reference is cleared, the list stays
        assertThat(jdbc.sql("select count(*) from lists where id = ?")
                        .param(list)
                        .query(Long.class)
                        .single())
                .isEqualTo(1L);
    }
}
