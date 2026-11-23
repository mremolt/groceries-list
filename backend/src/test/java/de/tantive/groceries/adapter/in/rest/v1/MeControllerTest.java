package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.DisplayName;
import de.tantive.groceries.domain.ReauthenticationRequiredException;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.DeleteAccountCommand;
import de.tantive.groceries.ports.in.DeleteAccountUseCase;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.ports.in.UpdateDisplayNameCommand;
import de.tantive.groceries.ports.in.UpdateDisplayNameUseCase;
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

    @MockitoBean
    UpdateDisplayNameUseCase updateDisplayName;

    @MockitoBean
    DeleteAccountUseCase deleteAccount;

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

    /**
     * The SPA's XSRF cookie and header by hand. The {@code csrf()} post processor would swap the CSRF repository of the
     * shared test context and make the anonymous-session test above order dependent.
     */
    private static org.springframework.test.web.servlet.request.RequestPostProcessor xsrf() {
        return request -> {
            request.setCookies(new jakarta.servlet.http.Cookie("XSRF-TOKEN", "test-token"));
            request.addHeader("X-XSRF-TOKEN", "test-token");
            return request;
        };
    }

    private MockMvcTester.MockMvcRequestBuilder patch(String body) {
        return mvc.patch().uri("/api/v1/me").contentType("application/json").content(body);
    }

    @Test
    void renameAnswers401WithoutASession() {
        assertThat(patch("{\"displayName\":\"X\"}").with(xsrf()).exchange()).hasStatus(401);
        verifyNoInteractions(updateDisplayName);
    }

    @Test
    void renameAnswers403WithoutACsrfToken() {
        assertThat(patch("{\"displayName\":\"X\"}").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(updateDisplayName);
    }

    @Test
    void renamesTheCallerAndAnswers200WithTheProfile() {
        when(updateDisplayName.updateDisplayName(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new CurrentUser(People.ALICE_ID, "Alice N.", "alice@example.test"));

        var result = patch("{\"displayName\":\" Alice N. \"}")
                .with(AppSessions.alice())
                .with(xsrf())
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo("{\"id\":\"" + People.ALICE_ID
                        + "\",\"displayName\":\"Alice N.\",\"email\":\"alice@example.test\"}");
        verify(updateDisplayName)
                .updateDisplayName(new UpdateDisplayNameCommand(People.alice(), DisplayName.of("Alice N.")));
    }

    @Test
    void refusesAnEmptyOrTooLongNameWith400AndTheFieldCode() {
        var empty = patch("{\"displayName\":\" \"}")
                .with(AppSessions.alice())
                .with(xsrf())
                .exchange();
        var tooLong = patch("{\"displayName\":\"" + "x".repeat(51) + "\"}")
                .with(AppSessions.alice())
                .with(xsrf())
                .exchange();

        assertThat(empty).hasStatus(400);
        assertThat(empty)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("VALIDATION_FAILED"))
                .hasPathSatisfying("$.errors[0].field", f -> f.assertThat().isEqualTo("displayName"))
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo("DISPLAY_NAME_REQUIRED"));
        assertThat(tooLong)
                .bodyJson()
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo("DISPLAY_NAME_TOO_LONG"));
        verifyNoInteractions(updateDisplayName);
    }

    @Test
    void deleteAnswers401WithoutASession() {
        assertThat(mvc.delete().uri("/api/v1/me").with(xsrf()).exchange()).hasStatus(401);
        verifyNoInteractions(deleteAccount);
    }

    @Test
    void deleteAnswers403WithoutACsrfToken() {
        assertThat(mvc.delete().uri("/api/v1/me").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(deleteAccount);
    }

    @Test
    void deleteWithoutAReauthenticationInTheSessionAsksForOne() {
        doThrow(new ReauthenticationRequiredException())
                .when(deleteAccount)
                .deleteAccount(org.mockito.ArgumentMatchers.any());

        var result = mvc.delete()
                .uri("/api/v1/me")
                .with(AppSessions.alice())
                .with(xsrf())
                .exchange();

        assertThat(result).hasStatus(403);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("REAUTH_REQUIRED"));
        verify(deleteAccount).deleteAccount(new DeleteAccountCommand(People.alice(), null));
    }

    @Test
    void deleteHandsTheSessionsConfirmationToTheUseCaseAndEndsTheSession() {
        var session = new org.springframework.mock.web.MockHttpSession();
        java.time.Instant confirmed = java.time.Instant.parse("2026-11-23T09:59:00Z");
        de.tantive.groceries.adapter.in.rest.ReauthSessions.confirm(session, confirmed);

        var result = mvc.delete()
                .uri("/api/v1/me")
                .session(session)
                .with(AppSessions.alice())
                .with(xsrf())
                .exchange();

        assertThat(result).hasStatus(204);
        verify(deleteAccount).deleteAccount(new DeleteAccountCommand(People.alice(), confirmed));
        assertThat(session.isInvalid()).isTrue();
    }
}
