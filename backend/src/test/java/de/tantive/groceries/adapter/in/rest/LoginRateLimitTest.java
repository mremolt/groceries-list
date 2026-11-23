package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Login starts allocate a session without a login: they are limited per client address (SPRING-SEC-21, T7). */
@WebMvcTest(
        controllers = LoginRateLimitTest.NoController.class,
        properties = "app.rate-limits.login-start-per-minute=3")
@SecuritySlice
class LoginRateLimitTest {

    @org.springframework.web.bind.annotation.RestController
    static class NoController {}

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    GetCurrentUserUseCase unused;

    @Test
    void answers429ProblemJsonAfterTheLimitAndStillServesOtherPaths() {
        for (int i = 0; i < 3; i++) {
            assertThat(mvc.get().uri("/oauth2/authorization/keycloak").exchange())
                    .hasStatus(302);
        }

        var limited = mvc.get().uri("/oauth2/authorization/keycloak").exchange();

        assertThat(limited).hasStatus(429);
        assertThat(limited.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(limited)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("RATE_LIMITED"));
        assertThat(limited.getResponse().getHeader("Retry-After")).isEqualTo("60");
        assertThat(mvc.get().uri("/config.json").exchange().getResponse().getStatus())
                .isNotEqualTo(429);
    }
}
