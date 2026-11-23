package de.tantive.groceries.support;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Arranges rows directly in the test database: each test makes its own users and lists (TS-TEST-34 spirit, TEST-TDD-16). */
public final class Arrange {

    private Arrange() {}

    public static UUID user(JdbcClient jdbc) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        insert into users (id, idp_subject, email, display_name, created_at, last_login_at)
                        values (?, ?, ?, 'Test', now(), now())
                        """).params(id, "sub-" + id, id + "@example.test").update();
        return id;
    }

    /** A user with a fixed id, as the test sessions of {@code AppSessions} carry it; arranging twice is harmless. */
    public static void user(JdbcClient jdbc, UUID id, String email) {
        jdbc.sql("""
                        insert into users (id, idp_subject, email, display_name, created_at, last_login_at)
                        values (?, ?, ?, 'Test', now(), now())
                        on conflict do nothing
                        """).params(id, "sub-" + id, email).update();
    }

    public static UUID list(JdbcClient jdbc, UUID member, String name, Instant joinedAt) {
        UUID id = UUID.randomUUID();
        jdbc.sql("insert into lists (id, name, created_by, created_at, updated_at) values (?, ?, ?, now(), now())")
                .params(id, name, member)
                .update();
        join(jdbc, member, id, joinedAt);
        return id;
    }

    public static void join(JdbcClient jdbc, UUID member, UUID list, Instant joinedAt) {
        jdbc.sql("insert into memberships (user_id, list_id, joined_at) values (?, ?, ?)")
                .params(member, list, Timestamp.from(joinedAt))
                .update();
    }

    public static UUID item(JdbcClient jdbc, UUID list, String text, boolean done, Instant createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.sql("insert into items (id, list_id, text, done, created_at) values (?, ?, ?, ?, ?)")
                .params(id, list, text, done, Timestamp.from(createdAt))
                .update();
        return id;
    }
}
