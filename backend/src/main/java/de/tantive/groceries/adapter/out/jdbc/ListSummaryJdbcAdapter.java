package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The navigation read model: all lists of a user with their open counts in one set-based statement (API-N1-05, ADR
 * 0006). The count of open items is the only column M3 changes: it adds a grouped sub-select over the items table.
 * Indexes: {@code memberships_user_joined_idx} for the filter and the order, the primary key of {@code lists} for the
 * join (SPRING-DB-17).
 */
@PersistenceAdapter
class ListSummaryJdbcAdapter implements ListSummaryPort {

    private static final String SUMMARY = """
            SELECT l.id, l.name, l.revision, 0 AS open_count
              FROM memberships m
              JOIN lists l ON l.id = m.list_id
             WHERE m.user_id = :userId
            """;

    private final JdbcClient jdbc;

    ListSummaryJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<ListSummary> findSummariesOf(UUID userId) {
        // hard upper bound of BR-12, enforced by the query itself (SPRING-DB-12, API-N1-07)
        return jdbc.sql(SUMMARY + " ORDER BY m.joined_at ASC, l.id ASC LIMIT " + ShoppingList.MAX_LISTS_PER_USER)
                .param("userId", userId)
                .query(ListSummaryJdbcAdapter::summary)
                .list();
    }

    @Override
    public Optional<ListSummary> findSummaryOf(UUID userId, UUID listId) {
        return jdbc.sql(SUMMARY + " AND l.id = :listId")
                .param("userId", userId)
                .param("listId", listId)
                .query(ListSummaryJdbcAdapter::summary)
                .optional();
    }

    private static ListSummary summary(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new ListSummary(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getInt("open_count"), rs.getLong("revision"));
    }
}
