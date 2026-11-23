package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;

/** The outbox of identity-provider deletions; a storage location of the deletion concept (DP-DEL). */
@PersistenceAdapter
class PendingIdpDeletionJdbcAdapter implements PendingIdpDeletionPort {

    private final JdbcClient jdbc;

    PendingIdpDeletionJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void add(String subject, Instant now) {
        jdbc.sql(
                        "INSERT INTO pending_idp_deletions (idp_subject, recorded_at) VALUES (:subject, :now) ON CONFLICT DO NOTHING")
                .param("subject", subject)
                .param("now", Timestamp.from(now))
                .update();
    }

    @Override
    public void remove(String subject) {
        jdbc.sql("DELETE FROM pending_idp_deletions WHERE idp_subject = :subject")
                .param("subject", subject)
                .update();
    }

    @Override
    public List<String> oldest(int limit) {
        return jdbc.sql("SELECT idp_subject FROM pending_idp_deletions ORDER BY recorded_at, idp_subject LIMIT :limit")
                .param("limit", limit)
                .query((rs, row) -> rs.getString("idp_subject"))
                .list();
    }
}
