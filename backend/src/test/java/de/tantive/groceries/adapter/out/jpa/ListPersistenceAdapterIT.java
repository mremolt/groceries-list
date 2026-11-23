package de.tantive.groceries.adapter.out.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

/** Outgoing adapter against the real PostgreSQL with the real migrations (TEST-ARCH-04, SPRING-DB-14). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class ListPersistenceAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    LoadListPort load;

    @Autowired
    SaveListPort save;

    @Autowired
    DeleteListPort delete;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    TransactionTemplate tx;

    @Test
    void storesAListAndFindsItForItsMemberOnly() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID id = UUID.randomUUID();
        save.create(ShoppingList.create(id, ListName.of("Wocheneinkauf"), alice, NOW));
        Arrange.join(jdbc, alice, id, NOW);

        assertThat(load.findForMember(id, alice)).hasValueSatisfying(list -> {
            assertThat(list.name().value()).isEqualTo("Wocheneinkauf");
            assertThat(list.createdBy()).isEqualTo(alice);
            assertThat(list.createdAt()).isEqualTo(NOW);
            assertThat(list.revision()).isZero();
        });
        assertThat(load.findForMember(id, bob)).isEmpty(); // cross-user: a non-member sees nothing
        assertThat(load.findForMember(UUID.randomUUID(), alice)).isEmpty();
    }

    @Test
    void aRenameSetsTheNameAndMovesTheRevision() {
        UUID alice = Arrange.user(jdbc);
        UUID id = Arrange.list(jdbc, alice, "WG", NOW);

        tx.executeWithoutResult(status -> save.rename(id, ListName.of("WG-Vorrat"), NOW.plusSeconds(30)));

        assertThat(load.findForMember(id, alice)).hasValueSatisfying(list -> {
            assertThat(list.name().value()).isEqualTo("WG-Vorrat");
            assertThat(list.updatedAt()).isEqualTo(NOW.plusSeconds(30));
            assertThat(list.revision()).isEqualTo(1);
        });
    }

    @Test
    void lastWriteWinsWhenTwoRenamesFollowEachOther() {
        UUID alice = Arrange.user(jdbc);
        UUID id = Arrange.list(jdbc, alice, "A", NOW);

        tx.executeWithoutResult(status -> save.rename(id, ListName.of("B"), NOW.plusSeconds(1)));
        tx.executeWithoutResult(status -> save.rename(id, ListName.of("C"), NOW.plusSeconds(2)));

        assertThat(load.findForMember(id, alice)).hasValueSatisfying(list -> {
            assertThat(list.name().value()).isEqualTo("C");
            assertThat(list.revision()).isEqualTo(2);
        });
    }

    @Test
    void deletingAListRemovesItsMembershipsToo() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID id = Arrange.list(jdbc, alice, "Grillabend", NOW);
        Arrange.join(jdbc, bob, id, NOW);

        tx.executeWithoutResult(status -> delete.delete(id));

        assertThat(load.findForMember(id, alice)).isEmpty();
        assertThat(jdbc.sql("select count(*) from memberships where list_id = ?")
                        .param(id)
                        .query(Long.class)
                        .single())
                .isZero();
    }

    @Test
    void theLockedReadFindsTheListForAMemberAndNotForAStranger() {
        UUID alice = Arrange.user(jdbc);
        UUID stranger = Arrange.user(jdbc);
        UUID id = Arrange.list(jdbc, alice, "WG", NOW);

        tx.executeWithoutResult(status -> {
            assertThat(load.findForMemberLocked(id, alice)).isPresent();
            assertThat(load.findForMemberLocked(id, stranger)).isEmpty();
        });
    }
}
