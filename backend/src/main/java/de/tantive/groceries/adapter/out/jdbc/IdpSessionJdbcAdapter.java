package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;

/** IdP session map and the ending of sessions in the Spring Session tables (SPRING-SEC-40); plain SQL, no entity (SPRING-DB-15). */
@PersistenceAdapter
class IdpSessionJdbcAdapter implements IdpSessionPort {

    private final JdbcClient jdbc;

    IdpSessionJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void record(String sessionId, String sid, String subject, Instant now) {
        jdbc.sql("""
                        INSERT INTO idp_sessions (session_id, sid, subject, recorded_at) VALUES (?, ?, ?, ?)
                        ON CONFLICT (session_id) DO UPDATE SET sid = EXCLUDED.sid, subject = EXCLUDED.subject,
                            recorded_at = EXCLUDED.recorded_at
                        """).params(sessionId, sid, subject, Timestamp.from(now)).update();
    }

    @Override
    public void purgeRecordedBefore(Instant cutoff) {
        jdbc.sql("DELETE FROM idp_sessions WHERE recorded_at < ?")
                .param(Timestamp.from(cutoff))
                .update();
    }

    @Override
    public void endBySid(String sid) {
        jdbc.sql("""
                        DELETE FROM spring_session WHERE session_id IN (SELECT session_id FROM idp_sessions WHERE sid = ?)
                        """).param(sid).update();
        jdbc.sql("DELETE FROM idp_sessions WHERE sid = ?").param(sid).update();
    }

    @Override
    public void endBySubject(String subject) {
        jdbc.sql("""
                        DELETE FROM spring_session WHERE session_id IN (SELECT session_id FROM idp_sessions WHERE subject = ?)
                        """).param(subject).update();
        jdbc.sql("DELETE FROM idp_sessions WHERE subject = ?").param(subject).update();
    }
}
