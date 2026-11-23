package de.tantive.groceries.adapter.out.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ItemText;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.StatementCounting;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

/** Items against the real PostgreSQL and migrations (TEST-ARCH-04, SPRING-DB-14); N+1 on the read (API-N1-06). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test"
        })
@Import({TestcontainersConfiguration.class, StatementCounting.class})
class ItemPersistenceAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    ItemPort items;

    @Autowired
    DeleteListPort deleteList;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    TransactionTemplate tx;

    private <T> T inTx(java.util.function.Supplier<T> work) {
        return java.util.Objects.requireNonNull(tx.execute(status -> work.get()));
    }

    private UUID newList() {
        return Arrange.list(jdbc, Arrange.user(jdbc), "WG", NOW);
    }

    private long revision(UUID list) {
        return jdbc.sql("select revision from lists where id = ?")
                .param(list)
                .query(Long.class)
                .single();
    }

    @Test
    void addStoresTheItemOpenAtVersionZeroAndMovesTheRevision() {
        UUID list = newList();

        Item saved = inTx(() -> items.add(list, Item.create(UUID.randomUUID(), ItemText.of("Milch"), NOW), NOW));

        assertThat(saved.text().value()).isEqualTo("Milch");
        assertThat(saved.done()).isFalse();
        assertThat(saved.version()).isZero();
        assertThat(items.countOf(list)).isEqualTo(1);
        assertThat(revision(list)).isEqualTo(1);
    }

    @Test
    void readsOldestFirstInOneStatementForAnyNumberOfItems() {
        UUID list = newList();
        UUID late = Arrange.item(jdbc, list, "Spät", false, NOW.plusSeconds(30));
        UUID early = Arrange.item(jdbc, list, "Früh", true, NOW);
        for (int i = 1; i <= 10; i++) {
            Arrange.item(jdbc, list, "Mitte " + i, false, NOW.plusSeconds(i));
        }
        StatementCounting.reset();

        List<Item> all = items.findAllOf(list);

        assertThat(all).hasSize(12);
        assertThat(all.getFirst().id()).isEqualTo(early);
        assertThat(all.getLast().id()).isEqualTo(late);
        assertThat(StatementCounting.statements()).isEqualTo(1);
    }

    @Test
    void neverReadsMoreThanFiveHundredItems() {
        UUID list = newList();
        jdbc.sql("""
                        insert into items (id, list_id, text, done, created_at)
                        select gen_random_uuid(), ?, 'I' || g, false, now() from generate_series(1, 505) g
                        """).param(list).update();

        assertThat(items.findAllOf(list)).hasSize(500);
    }

    @Test
    void updateSetsOnlyTheGivenPartsBumpsTheVersionAndMovesTheRevision() {
        UUID list = newList();
        UUID id = Arrange.item(jdbc, list, "Milch", false, NOW);

        Optional<Item> checked = inTx(() -> items.update(list, id, null, true, NOW));
        Optional<Item> renamed = inTx(() -> items.update(list, id, ItemText.of("Hafermilch"), null, NOW));

        assertThat(checked).hasValueSatisfying(i -> {
            assertThat(i.done()).isTrue();
            assertThat(i.text().value()).isEqualTo("Milch");
            assertThat(i.version()).isEqualTo(1);
        });
        assertThat(renamed).hasValueSatisfying(i -> {
            assertThat(i.done()).isTrue();
            assertThat(i.text().value()).isEqualTo("Hafermilch");
            assertThat(i.version()).isEqualTo(2);
        });
        assertThat(revision(list)).isEqualTo(2);
    }

    @Test
    void anItemOfAnotherListIsNotFoundAndChangesNothing() {
        UUID mine = newList();
        UUID other = newList();
        UUID foreign = Arrange.item(jdbc, other, "Fremd", false, NOW);

        assertThat(inTx(() -> items.update(mine, foreign, null, true, NOW))).isEmpty();
        assertThat(inTx(() -> items.delete(mine, foreign, NOW))).isFalse();
        assertThat(inTx(() -> items.deleteChecked(mine, Set.of(foreign), NOW))).isZero();

        assertThat(items.findAllOf(other)).extracting(Item::done).containsExactly(false);
        assertThat(revision(mine)).isZero();
    }

    @Test
    void deleteRemovesTheItemAndOnlyThenMovesTheRevision() {
        UUID list = newList();
        UUID id = Arrange.item(jdbc, list, "Milch", false, NOW);

        assertThat(inTx(() -> items.delete(list, id, NOW))).isTrue();
        assertThat(inTx(() -> items.delete(list, id, NOW))).isFalse();

        assertThat(items.countOf(list)).isZero();
        assertThat(revision(list)).isEqualTo(1);
    }

    @Test
    void deleteCheckedRemovesOnlyTheGivenItemsThatAreStillChecked() {
        UUID list = newList();
        UUID stillChecked = Arrange.item(jdbc, list, "Erledigt", true, NOW);
        UUID uncheckedMeanwhile = Arrange.item(jdbc, list, "Doch nicht", false, NOW.plusSeconds(1));
        UUID checkedByOthers = Arrange.item(jdbc, list, "Neu erledigt", true, NOW.plusSeconds(2));

        int removed = inTx(() -> items.deleteChecked(list, Set.of(stillChecked, uncheckedMeanwhile), NOW));

        assertThat(removed).isEqualTo(1);
        assertThat(items.findAllOf(list)).extracting(Item::id).containsExactly(uncheckedMeanwhile, checkedByOthers);
    }

    @Test
    void deletingTheListDeletesItsItems() {
        UUID list = newList();
        Arrange.item(jdbc, list, "Milch", false, NOW);

        deleteList.delete(list);

        assertThat(jdbc.sql("select count(*) from items where list_id = ?")
                        .param(list)
                        .query(Long.class)
                        .single())
                .isZero();
    }
}
