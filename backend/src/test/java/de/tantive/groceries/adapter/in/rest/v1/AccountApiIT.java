package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * FR-SET-01 and FR-SET-04 through the real security chain, use cases and PostgreSQL. Every test makes its own people:
 * deleting the shared test people would break the other integration tests that run against the same database.
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Tag("cross-user")
class AccountApiIT {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    SessionRepository<?> sessions;

    @MockitoBean
    IdentityProviderPort identityProvider;

    /** A stored BFF session that proves a re-authentication at {@code at}, as the login callback would leave it. */
    private String sessionConfirmedAt(Instant at) {
        return createSession(sessions, at);
    }

    private static <S extends Session> String createSession(SessionRepository<S> repository, Instant at) {
        S session = repository.createSession();
        session.setAttribute("app.reauth.confirmed-at", at);
        repository.save(session);
        return session.getId();
    }

    /** MockMvc applies none of the server.servlet.session.cookie.* settings: the cookie is the default {@code SESSION}. */
    private static jakarta.servlet.http.Cookie sessionCookie(String sessionId) {
        return new jakarta.servlet.http.Cookie(
                "SESSION",
                java.util.Base64.getEncoder()
                        .encodeToString(sessionId.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }

    private UUID person() {
        return Arrange.user(jdbc);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor as(UUID id) {
        return AppSessions.person(id, id + "@example.test", "Test");
    }

    private long count(String sql, Object... params) {
        return jdbc.sql(sql).params(params).query(Long.class).single();
    }

    @Test
    void renamingChangesOnlyTheCallersOwnName() {
        UUID alice = person();
        UUID bob = person();

        var result = mvc.patch()
                .uri("/api/v1/me")
                .with(as(alice))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"  Alice Neu \"}")
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.displayName", n -> n.assertThat().isEqualTo("Alice Neu"));
        assertThat(jdbc.sql("select display_name from users where id = ?")
                        .param(alice)
                        .query(String.class)
                        .single())
                .isEqualTo("Alice Neu");
        assertThat(jdbc.sql("select display_name from users where id = ?")
                        .param(bob)
                        .query(String.class)
                        .single())
                .isEqualTo("Test");
        var me = mvc.get().uri("/api/v1/me").with(as(alice)).exchange();
        assertThat(me)
                .bodyJson()
                .hasPathSatisfying("$.displayName", n -> n.assertThat().isEqualTo("Alice Neu"));
    }

    @Test
    void anInvalidNameIsRefusedAndNothingChanges() {
        UUID alice = person();

        var result = mvc.patch()
                .uri("/api/v1/me")
                .with(as(alice))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"" + "x".repeat(51) + "\"}")
                .exchange();

        assertThat(result).hasStatus(400);
        assertThat(jdbc.sql("select display_name from users where id = ?")
                        .param(alice)
                        .query(String.class)
                        .single())
                .isEqualTo("Test");
    }

    @Test
    void deletingWithoutAFreshLoginAnswers403ReauthRequiredAndDeletesNothing() {
        UUID alice = person();
        String sessionId = sessionConfirmedAt(Instant.now().minusSeconds(6 * 60)); // too old

        var stale = mvc.delete()
                .uri("/api/v1/me")
                .cookie(sessionCookie(sessionId))
                .with(as(alice))
                .with(csrf())
                .exchange();
        var never = mvc.delete().uri("/api/v1/me").with(as(alice)).with(csrf()).exchange();

        for (var result : java.util.List.of(stale, never)) {
            assertThat(result).hasStatus(403);
            assertThat(result)
                    .bodyJson()
                    .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("REAUTH_REQUIRED"));
        }
        assertThat(count("select count(*) from users where id = ?", alice)).isOne();
    }

    @Test
    void deletingAfterAFreshLoginRemovesOnlyTheCallersAccountAndEndsTheSession() throws Exception {
        UUID alice = person();
        UUID bob = person();
        UUID shared = Arrange.list(jdbc, alice, "Gemeinsam", Instant.now());
        Arrange.join(jdbc, bob, shared, Instant.now());
        UUID alone = Arrange.list(jdbc, alice, "Allein", Instant.now());
        String sessionId = sessionConfirmedAt(Instant.now().minusSeconds(30));

        var result = mvc.delete()
                .uri("/api/v1/me")
                .cookie(sessionCookie(sessionId))
                .with(as(alice))
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(204);
        assertThat(sessions.findById(sessionId))
                .as("the request's own session is gone")
                .isNull();
        assertThat(count("select count(*) from users where id = ?", alice)).isZero();
        assertThat(count("select count(*) from lists where id = ?", alone)).isZero();
        assertThat(count("select count(*) from lists where id = ?", shared)).isOne();
        assertThat(count("select count(*) from users where id = ?", bob)).isOne();
        verify(identityProvider).deleteUser("sub-" + alice);
    }

    @Test
    void anAnonymousCallCannotDeleteAnything() {
        UUID alice = person();

        var result = mvc.delete().uri("/api/v1/me").with(csrf()).exchange();

        assertThat(result).hasStatus(401);
        assertThat(count("select count(*) from users where id = ?", alice)).isOne();
    }
}
