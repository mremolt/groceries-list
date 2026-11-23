package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.ports.out.DeleteUserPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Erases an account row. Memberships cascade, {@code lists.created_by} is set to null (BR-02); items carry no author
 * (SPRING-DP-03, BR-04). Plain SQL: nothing is loaded, so no stale entity stays in the persistence context.
 */
@PersistenceAdapter
class UserDeletionJdbcAdapter implements DeleteUserPort {

    private final JdbcClient jdbc;

    UserDeletionJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void delete(UUID userId) {
        jdbc.sql("DELETE FROM users WHERE id = :id").param("id", userId).update();
    }
}
