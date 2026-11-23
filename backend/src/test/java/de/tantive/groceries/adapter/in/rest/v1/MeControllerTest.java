package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.support.People;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Web slice test (TEST-ARCH-03, SPRING-SEC-10): 401 without a session, success with one, problem+json shape. */
@WebMvcTest(controllers = MeController.class)
@SecuritySlice
class MeControllerTest {

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    GetCurrentUserUseCase getCurrentUser;

    @Test
    void anAnonymousCallCreatesNoServerSideSession() {
        var result = mvc.get().uri("/api/v1/me").exchange();

        assertThat(result.getRequest().getSession(false)).isNull();
        assertThat(result.getResponse().getHeaders("Set-Cookie")).noneMatch(cookie -> cookie.startsWith("SESSION"));
    }

    @Test
    void answers401ProblemJsonWithoutASession() {
        var result = mvc.get().uri("/api/v1/me").exchange();

        assertThat(result).hasStatus(401);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("UNAUTHENTICATED"));
    }

    @Test
    void returnsTheProfileOfTheLoggedInPerson() {
        when(getCurrentUser.currentUser(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CurrentUser(People.ALICE_ID, "Alice Example", "alice@example.test"));

        var result = mvc.get().uri("/api/v1/me").with(AppSessions.alice()).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo("{\"id\":\"" + People.ALICE_ID
                        + "\",\"displayName\":\"Alice Example\",\"email\":\"alice@example.test\"}");
    }
}
