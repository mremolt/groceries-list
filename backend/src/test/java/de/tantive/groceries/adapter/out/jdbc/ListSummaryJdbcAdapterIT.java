package de.tantive.groceries.adapter.out.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.StatementCounting;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Read model of the navigation against the real database; one statement for all lists (API-N1-05/06, SPRING-TEST-06). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test"
        })
@Import({TestcontainersConfiguration.class, StatementCounting.class})
class ListSummaryJdbcAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    ListSummaryPort summaries;

    @Autowired
    JdbcClient jdbc;

    @Test
    void listsTheListsOfAUserByTheirJoinTimeOldestFirst() {
        UUID alice = Arrange.user(jdbc);
        UUID joinedLast = Arrange.list(jdbc, alice, "Spät", NOW.plusSeconds(60));
        UUID joinedFirst = Arrange.list(jdbc, alice, "Früh", NOW);

        List<ListSummary> result = summaries.findSummariesOf(alice);

        assertThat(result).extracting(ListSummary::id).containsExactly(joinedFirst, joinedLast);
        assertThat(result).extracting(ListSummary::name).containsExactly("Früh", "Spät");
        assertThat(result).allSatisfy(summary -> {
            assertThat(summary.openCount()).isZero();
            assertThat(summary.revision()).isZero();
        });
    }

    @Test
    void usesOneStatementNoMatterHowManyListsTheUserHas() {
        UUID alice = Arrange.user(jdbc);
        for (int i = 0; i < 12; i++) {
            Arrange.list(jdbc, alice, "Liste " + i, NOW.plusSeconds(i));
        }
        StatementCounting.reset();

        List<ListSummary> result = summaries.findSummariesOf(alice);

        assertThat(result).hasSize(12);
        assertThat(StatementCounting.statements()).isEqualTo(1);
    }

    @Test
    void neverReturnsMoreThanTheHundredListsOfBr12() {
        UUID alice = Arrange.user(jdbc);
        jdbc.sql("""
                        insert into lists (id, name, created_by, created_at, updated_at)
                        select gen_random_uuid(), 'L' || g, ?, now(), now() from generate_series(1, 105) g
                        """).param(alice).update();
        jdbc.sql("""
                        insert into memberships (user_id, list_id, joined_at)
                        select ?, id, now() from lists where created_by = ?
                        """).params(alice, alice).update();

        assertThat(summaries.findSummariesOf(alice)).hasSize(100);
    }

    @Test
    void findsASingleListOnlyForItsMember() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        UUID list = Arrange.list(jdbc, alice, "Wocheneinkauf", NOW);

        assertThat(summaries.findSummaryOf(alice, list)).contains(new ListSummary(list, "Wocheneinkauf", 0, 0));
        assertThat(summaries.findSummaryOf(bob, list)).isEmpty();
        assertThat(summaries.findSummaryOf(alice, UUID.randomUUID())).isEmpty();
    }

    @Test
    void doesNotShowTheListsOfOtherUsers() {
        UUID alice = Arrange.user(jdbc);
        UUID bob = Arrange.user(jdbc);
        Arrange.list(jdbc, alice, "Nur Alice", NOW);

        assertThat(summaries.findSummariesOf(bob)).isEmpty();
    }

    @Test
    void countsOnlyTheOpenItemsOfEachListInOneStatement() {
        UUID alice = Arrange.user(jdbc);
        UUID a = Arrange.list(jdbc, alice, "A", NOW);
        UUID b = Arrange.list(jdbc, alice, "B", NOW.plusSeconds(1));
        Arrange.item(jdbc, a, "Milch", false, NOW);
        Arrange.item(jdbc, a, "Brot", false, NOW.plusSeconds(1));
        Arrange.item(jdbc, a, "Eier", true, NOW.plusSeconds(2));
        Arrange.item(jdbc, b, "Käse", true, NOW);
        StatementCounting.reset();

        List<ListSummary> result = summaries.findSummariesOf(alice);

        assertThat(result).extracting(ListSummary::openCount).containsExactly(2, 0);
        assertThat(StatementCounting.statements()).isEqualTo(1);
        assertThat(summaries.findSummaryOf(alice, a))
                .hasValueSatisfying(s -> assertThat(s.openCount()).isEqualTo(2));
    }
}
