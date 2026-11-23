package de.tantive.groceries.adapter.out.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Ending sessions by IdP session id or subject, against the real Spring Session tables (SPRING-SEC-40). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class IdpSessionJdbcAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    IdpSessionPort port;

    @Autowired
    JdbcClient jdbc;

    @Test
    void endsExactlyTheSessionsOfTheGivenSid() {
        String subject = "sub-" + UUID.randomUUID();
        String sidA = "sid-a-" + UUID.randomUUID();
        String sidB = "sid-b-" + UUID.randomUUID();
        String sessionA1 = session();
        String sessionA2 = session();
        String sessionB = session();
        port.record(sessionA1, sidA, subject, NOW);
        port.record(sessionA2, sidA, subject, NOW);
        port.record(sessionB, sidB, subject, NOW);

        port.endBySid(sidA);

        assertThat(exists(sessionA1)).isFalse();
        assertThat(exists(sessionA2)).isFalse();
        assertThat(exists(sessionB)).isTrue();
        assertThat(attributes(sessionA1)).isZero();
    }

    @Test
    void endsAllSessionsOfASubjectButNoOthers() {
        String subject = "sub-" + UUID.randomUUID();
        String mine = session();
        String other = session();
        port.record(mine, "sid-1", subject, NOW);
        port.record(other, "sid-2", "someone-else-" + UUID.randomUUID(), NOW);

        port.endBySubject(subject);

        assertThat(exists(mine)).isFalse();
        assertThat(exists(other)).isTrue();
    }

    @Test
    void endingAnUnknownSidChangesNothing() {
        String kept = session();
        port.record(kept, "sid-kept", "sub-kept", NOW);

        port.endBySid("unknown-sid");
        port.endBySid("unknown-sid");

        assertThat(exists(kept)).isTrue();
    }

    @Test
    void purgesRowsRecordedBeforeTheCutoff() {
        String old = session();
        port.record(old, "sid-old", "sub-old", NOW.minusSeconds(100));

        port.purgeRecordedBefore(NOW);

        assertThat(jdbc.sql("select count(*) from idp_sessions where session_id = ?")
                        .param(old)
                        .query(Long.class)
                        .single())
                .isZero();
    }

    private String session() {
        String id = UUID.randomUUID().toString();
        jdbc.sql(
                        "insert into spring_session (primary_id, session_id, creation_time, last_access_time, max_inactive_interval, expiry_time)"
                                + " values (?, ?, 0, 0, 100, 9999999999999)")
                .params(id, id)
                .update();
        jdbc.sql(
                        "insert into spring_session_attributes (session_primary_id, attribute_name, attribute_bytes) values (?, 'a', ?)")
                .params(id, new byte[] {1})
                .update();
        return id;
    }

    private boolean exists(String id) {
        return jdbc.sql("select count(*) from spring_session where session_id = ?")
                        .param(id)
                        .query(Long.class)
                        .single()
                == 1L;
    }

    private long attributes(String id) {
        return jdbc.sql("select count(*) from spring_session_attributes where session_primary_id = ?")
                .param(id)
                .query(Long.class)
                .single();
    }
}
