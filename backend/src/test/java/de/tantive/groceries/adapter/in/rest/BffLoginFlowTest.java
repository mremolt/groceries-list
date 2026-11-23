package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import de.tantive.groceries.ports.in.EndIdpSessionsCommand;
import de.tantive.groceries.ports.in.EndIdpSessionsUseCase;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.ports.in.ProvideUserCommand;
import de.tantive.groceries.ports.in.ProvideUserResult;
import de.tantive.groceries.ports.in.ProvideUserUseCase;
import de.tantive.groceries.ports.in.RegisterIdpSessionCommand;
import de.tantive.groceries.ports.in.RegisterIdpSessionUseCase;
import de.tantive.groceries.support.People;
import java.net.URI;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * The BFF login logic against a stub identity provider: authorization request (PKCE, prompt), code exchange and ID token
 * verification with explicit timeouts, user provisioning, session id rotation, logout and back-channel logout. The real
 * Keycloak is exercised by the real-backend E2E tier.
 */
@WebMvcTest(controllers = BffLoginFlowTest.NoController.class)
@SecuritySlice
class BffLoginFlowTest {

    private static final IdpStub IDP = new IdpStub();

    @DynamicPropertySource
    static void idp(DynamicPropertyRegistry registry) {
        registry.add("app.auth.issuer-uri", IDP::issuer);
        registry.add("app.rate-limits.login-start-per-minute", () -> "1000");
    }

    @AfterAll
    static void stop() {
        IDP.close();
    }

    private static String location(org.springframework.test.web.servlet.assertj.MvcTestResult result) {
        return java.util.Objects.requireNonNull(result.getResponse().getHeader("Location"), "Location header");
    }

    private static org.springframework.util.MultiValueMap<String, String> query(
            org.springframework.test.web.servlet.assertj.MvcTestResult result) {
        return UriComponentsBuilder.fromUriString(location(result)).build().getQueryParams();
    }

    private static String param(org.springframework.test.web.servlet.assertj.MvcTestResult result, String name) {
        return org.springframework.web.util.UriUtils.decode(
                java.util.Objects.requireNonNull(query(result).getFirst(name), name),
                java.nio.charset.StandardCharsets.UTF_8);
    }

    @org.springframework.web.bind.annotation.RestController
    static class NoController {}

    @Autowired
    MockMvcTester mvc;

    @Autowired
    org.springframework.context.ApplicationContext context;

    @Autowired
    ProvideUserUseCase provideUser;

    @Autowired
    RegisterIdpSessionUseCase registerSession;

    @Autowired
    EndIdpSessionsUseCase endSessions;

    @MockitoBean
    GetCurrentUserUseCase unused;

    @BeforeEach
    void resetDoubles() {
        reset(provideUser, registerSession, endSessions);
    }

    @Test
    void startsTheLoginWithPkceAndNoPromptByDefault() {
        var result = mvc.get().uri("/oauth2/authorization/keycloak").exchange();

        assertThat(result).hasStatus(302);
        var location = UriComponentsBuilder.fromUriString(location(result)).build();
        assertThat(location.toUriString()).startsWith(IDP.issuer() + "/protocol/openid-connect/auth");
        assertThat(location.getQueryParams().getFirst("client_id")).isEqualTo("groceries-bff");
        assertThat(location.getQueryParams().getFirst("code_challenge_method")).isEqualTo("S256");
        assertThat(location.getQueryParams().getFirst("code_challenge")).isNotBlank();
        assertThat(location.getQueryParams()).doesNotContainKey("prompt");
    }

    @Test
    void passesPromptCreateToTheIdentityProvider() {
        var result =
                mvc.get().uri("/oauth2/authorization/keycloak?prompt=create").exchange();

        assertThat(param(result, "prompt")).isEqualTo("create");
    }

    @Test
    void dropsEveryOtherPromptValue() {
        var result = mvc.get().uri("/oauth2/authorization/keycloak?prompt=none").exchange();

        assertThat(query(result)).doesNotContainKey("prompt");
    }

    @Test
    void completesTheLoginProvisionsTheAccountRotatesTheSessionIdAndRegistersTheIdpSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        var start =
                mvc.get().uri("/oauth2/authorization/keycloak").session(session).exchange();
        String state = param(start, "state");
        IDP.willIssueIdToken("sub-alice", "alice@example.test", "Alice Example", "sid-1", param(start, "nonce"));
        when(provideUser.provide(any()))
                .thenReturn(new ProvideUserResult(People.ALICE_ID, "alice@example.test", "Alice Example"));

        var callback = mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", state)
                .session(session)
                .exchange();

        assertThat(callback).hasStatus(302);
        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/");
        ArgumentCaptor<ProvideUserCommand> command = ArgumentCaptor.forClass(ProvideUserCommand.class);
        verify(provideUser).provide(command.capture());
        assertThat(command.getValue())
                .isEqualTo(new ProvideUserCommand("sub-alice", "alice@example.test", "Alice Example"));
        ArgumentCaptor<RegisterIdpSessionCommand> registered = ArgumentCaptor.forClass(RegisterIdpSessionCommand.class);
        verify(registerSession).register(registered.capture());
        assertThat(registered.getValue().sid()).isEqualTo("sid-1");
        assertThat(registered.getValue().sessionId()).isNotBlank();
    }

    @Test
    void aLoginThatStartedAtAnInvitationEndsAtTheConsumePageWithTheTokenStillInTheSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        var token = de.tantive.groceries.domain.ShareToken.generate();
        PendingInvitation.remember(session, token);
        var start =
                mvc.get().uri("/oauth2/authorization/keycloak").session(session).exchange();
        IDP.willIssueIdToken("sub-alice", "alice@example.test", "Alice Example", "sid-2", param(start, "nonce"));
        when(provideUser.provide(any()))
                .thenReturn(new ProvideUserResult(People.ALICE_ID, "alice@example.test", "Alice Example"));

        var callback = mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", param(start, "state"))
                .session(session)
                .exchange();

        assertThat(callback).hasStatus(302);
        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/j/consume"); // no token in the URL
        assertThat(PendingInvitation.peek(session)).isEqualTo(token.value());
        assertThat(session.getMaxInactiveInterval()).isNotEqualTo(2 * 60 * 60); // a person's session again
    }

    @Test
    void reauthenticationAsksTheIdpForTheCredentialsAndRemembersWhoIsExpected() {
        MockHttpSession session = new MockHttpSession();

        var result = mvc.get()
                .uri("/oauth2/authorization/keycloak?reauth=1")
                .session(session)
                .with(AppSessions.alice())
                .exchange();

        assertThat(param(result, "prompt")).isEqualTo("login");
        assertThat(param(result, "max_age")).isEqualTo("0");
        assertThat(session.getAttribute("app.reauth.expected-subject")).isEqualTo("sub-alice");
    }

    @Test
    void reauthenticationWithoutASessionIsAnOrdinaryLogin() {
        MockHttpSession session = new MockHttpSession();

        var result = mvc.get()
                .uri("/oauth2/authorization/keycloak?reauth=1")
                .session(session)
                .exchange();

        assertThat(query(result)).doesNotContainKeys("prompt", "max_age");
        assertThat(session.getAttribute("app.reauth.expected-subject")).isNull();
    }

    @Test
    void onlyTheValueOneStartsAReauthentication() {
        var result = mvc.get()
                .uri("/oauth2/authorization/keycloak?reauth=yes")
                .with(AppSessions.alice())
                .exchange();

        assertThat(query(result)).doesNotContainKeys("prompt", "max_age");
    }

    private org.springframework.test.web.servlet.assertj.MvcTestResult reauthenticate(
            MockHttpSession session, String subject, Instant authTime) {
        var start = mvc.get()
                .uri("/oauth2/authorization/keycloak?reauth=1")
                .session(session)
                .with(AppSessions.alice())
                .exchange();
        IDP.willIssueIdToken(subject, subject + "@example.test", "Alice", "sid-r", param(start, "nonce"), authTime);
        when(provideUser.provide(any()))
                .thenReturn(new ProvideUserResult(People.ALICE_ID, subject + "@example.test", "Alice"));
        return mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", param(start, "state"))
                .session(session)
                .exchange();
    }

    @Test
    void aFreshLoginOfTheSamePersonConfirmsTheReauthenticationAndOpensTheDeletionDialog() {
        MockHttpSession session = new MockHttpSession();

        var callback = reauthenticate(session, "sub-alice", SecuritySliceBeans.NOW.minusSeconds(20));

        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/einstellungen?konto-loeschen");
        assertThat(ReauthSession.confirmedAt(session)).isEqualTo(SecuritySliceBeans.NOW);
        assertThat(session.getAttribute("app.reauth.expected-subject")).isNull();
    }

    @Test
    void aLoginWhoseAuthTimeIsOlderThanFiveMinutesDoesNotConfirm() {
        MockHttpSession session = new MockHttpSession();

        var callback = reauthenticate(session, "sub-alice", SecuritySliceBeans.NOW.minusSeconds(6 * 60));

        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/einstellungen");
        assertThat(ReauthSession.confirmedAt(session)).isNull();
    }

    @Test
    void aLoginAsAnotherPersonDoesNotConfirm() {
        MockHttpSession session = new MockHttpSession();
        // the session starts as Alice (expected subject sub-alice), but Mallory types her credentials
        var start = mvc.get()
                .uri("/oauth2/authorization/keycloak?reauth=1")
                .session(session)
                .with(AppSessions.alice())
                .exchange();
        IDP.willIssueIdToken(
                "sub-mallory", "m@example.test", "Mallory", "sid-m", param(start, "nonce"), SecuritySliceBeans.NOW);
        when(provideUser.provide(any())).thenReturn(new ProvideUserResult(People.BOB_ID, "m@example.test", "Mallory"));

        var callback = mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", param(start, "state"))
                .session(session)
                .exchange();

        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/einstellungen");
        assertThat(ReauthSession.confirmedAt(session)).isNull();
    }

    @Test
    void anOrdinaryLoginForgetsAnEarlierConfirmation() throws Exception {
        MockHttpSession session = new MockHttpSession();
        ReauthSession.confirm(session, SecuritySliceBeans.NOW.minusSeconds(30));
        var start =
                mvc.get().uri("/oauth2/authorization/keycloak").session(session).exchange();
        IDP.willIssueIdToken("sub-alice", "alice@example.test", "Alice", "sid-o", param(start, "nonce"));
        when(provideUser.provide(any()))
                .thenReturn(new ProvideUserResult(People.ALICE_ID, "alice@example.test", "Alice"));

        mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", param(start, "state"))
                .session(session)
                .exchange();

        assertThat(ReauthSession.confirmedAt(session)).isNull();
    }

    @Test
    void refusesAnIdTokenWithTheWrongNonceAndLogsNoTokenOrAddress() {
        MockHttpSession session = new MockHttpSession();
        var start =
                mvc.get().uri("/oauth2/authorization/keycloak").session(session).exchange();
        String state = param(start, "state");
        IDP.willIssueIdToken("sub-alice", "alice@example.test", "Alice", "sid-1", "not-the-nonce");

        var callback = mvc.get()
                .uri("/login/oauth2/code/keycloak?code=abc&state={state}", state)
                .session(session)
                .exchange();

        assertThat(callback.getResponse().getHeader("Location")).isEqualTo("/?login=failed");
        verify(provideUser, never()).provide(any());
        verify(registerSession, never()).register(any());
    }

    @Test
    void refusesALogoutWithoutAXsrfToken() {
        assertThat(mvc.post().uri("/logout").with(AppSessions.alice()).exchange())
                .hasStatus(403);
    }

    @Test
    void answersAnXhrLogoutWithTheEndSessionUrlAsJson() {
        var result = mvc.post()
                .uri("/logout")
                .with(AppSessions.alice())
                .with(csrf())
                .accept("application/json")
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying(
                        "$.redirectUri",
                        uri -> uri.assertThat()
                                .asString()
                                .startsWith(IDP.issuer() + "/protocol/openid-connect/logout")
                                .contains("id_token_hint=")
                                .contains("post_logout_redirect_uri="));
    }

    @Test
    void answersAFormLogoutWithASeeOtherRedirect() {
        var result =
                mvc.post().uri("/logout").with(AppSessions.alice()).with(csrf()).exchange();

        assertThat(result).hasStatus(303);
        assertThat(result.getResponse().getHeader("Location"))
                .startsWith(IDP.issuer() + "/protocol/openid-connect/logout");
    }

    @Test
    void endsTheSessionsOfTheSidOfAValidBackChannelLogoutToken() {
        var result = mvc.post()
                .uri("/logout/connect/back-channel/keycloak")
                .contentType("application/x-www-form-urlencoded")
                .content("logout_token=" + IDP.logoutToken("sub-alice", "sid-9"))
                .exchange();

        assertThat(result).hasStatusOk();
        verify(endSessions).end(new EndIdpSessionsCommand("sub-alice", "sid-9"));
    }

    @Test
    void changesNothingForABackChannelLogoutTokenWithAWrongSignature() throws Exception {
        var forged = new com.nimbusds.jose.jwk.gen.RSAKeyGenerator(2048)
                .keyID("test-key")
                .generate();
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(),
                new JWTClaimsSet.Builder()
                        .issuer(IDP.issuer())
                        .audience(List.of(IdpStub.CLIENT_ID))
                        .subject("sub-alice")
                        .claim("sid", "sid-9")
                        .jwtID("x")
                        .claim("events", Map.of("http://schemas.openid.net/event/backchannel-logout", Map.of()))
                        .issueTime(Date.from(Instant.now()))
                        .build());
        jwt.sign(new RSASSASigner(forged));

        var result = mvc.post()
                .uri("/logout/connect/back-channel/keycloak")
                .contentType("application/x-www-form-urlencoded")
                .content("logout_token=" + jwt.serialize())
                .exchange();

        assertThat(result).hasStatus4xxClientError();
        verify(endSessions, never()).end(any());
    }

    /**
     * MockMvc's mock session does not rotate its id through the request wrappers of the filter chain, so the rotation is
     * asserted on the configuration: the login filter carries the session-id-changing strategy (SPRING-SEC-32).
     */
    @Test
    void rotatesTheSessionIdAtLogin() {
        var chains = context.getBean(org.springframework.security.web.FilterChainProxy.class)
                .getFilterChains();
        var login = chains.stream()
                .flatMap(chain -> chain.getFilters().stream())
                .filter(
                        org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter.class
                                ::isInstance)
                .findFirst()
                .orElseThrow();

        assertThat(org.springframework.test.util.ReflectionTestUtils.getField(login, "sessionStrategy"))
                .isInstanceOf(
                        org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy
                                .class);
    }

    @Test
    void redirectTargetsAfterLoginMustBeInternalPaths() {
        assertThat(InternalPaths.isInternal("/listen/3")).isTrue();
        assertThat(InternalPaths.isInternal("//evil.example")).isFalse();
        assertThat(InternalPaths.isInternal("https://evil.example/")).isFalse();
        assertThat(InternalPaths.isInternal("/\\evil.example")).isFalse();
        assertThat(InternalPaths.isInternal("")).isFalse();
        assertThat(InternalPaths.orRoot("javascript:alert(1)")).isEqualTo("/");
        assertThat(URI.create("/ok").getHost()).isNull();
    }
}
