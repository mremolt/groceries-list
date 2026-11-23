package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.ports.in.EndIdpSessionsCommand;
import de.tantive.groceries.ports.in.EndIdpSessionsUseCase;
import de.tantive.groceries.ports.in.RegisterIdpSessionCommand;
import de.tantive.groceries.ports.in.RegisterIdpSessionUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.oidc.authentication.logout.OidcLogoutToken;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import tools.jackson.databind.json.JsonMapper;

/** Handlers around the login and the logout: they translate to use-case calls and audit events (SPRING-SEC-22/40). */
final class LoginHandlers {

    /** Session attribute for a validated internal path to open after login (set by the join flow, M4). */
    static final String POST_LOGIN_PATH = "app.post-login-path";

    private LoginHandlers() {}

    static AuthenticationSuccessHandler success(RegisterIdpSessionUseCase registerSession) {
        return (HttpServletRequest request, HttpServletResponse response, Authentication authentication) -> {
            if (authentication.getPrincipal() instanceof AppOidcUser user) {
                HttpSession session = request.getSession();
                String sid = user.getClaimAsString("sid");
                registerSession.register(new RegisterIdpSessionCommand(
                        session.getId(), sid == null ? "" : sid, user.toCaller().subject()));
                AuditLog.loginSucceeded(user.toCaller().userId());
                Object requested = session.getAttribute(POST_LOGIN_PATH);
                session.removeAttribute(POST_LOGIN_PATH);
                response.sendRedirect(requested instanceof String path ? InternalPaths.orRoot(path) : "/");
            } else {
                response.sendRedirect("/");
            }
        };
    }

    static AuthenticationFailureHandler failure() {
        return (HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) -> {
            AuditLog.loginFailed(exception.getClass().getSimpleName());
            response.sendRedirect("/?login=failed");
        };
    }

    /** Logout of the user's own session: audit only; the IdP session is ended by the success handler's redirect. */
    static LogoutHandler loggedOut() {
        return (HttpServletRequest request, HttpServletResponse response, @Nullable Authentication authentication) -> {
            if (authentication != null && authentication.getPrincipal() instanceof AppOidcUser user) {
                AuditLog.loggedOut(user.toCaller().userId());
            }
        };
    }

    /**
     * Back-channel logout (SPRING-SEC-40): the logout token is validated by Spring Security's filter; this handler ends the
     * sessions through the use case instead of the default handler, which would post to {@code /logout} with a session
     * cookie that a JDBC store cannot resolve.
     */
    static LogoutHandler backChannel(EndIdpSessionsUseCase endSessions) {
        return (HttpServletRequest request, HttpServletResponse response, @Nullable Authentication authentication) -> {
            if (authentication != null && authentication.getPrincipal() instanceof OidcLogoutToken token) {
                String sid = token.getSessionId();
                endSessions.end(new EndIdpSessionsCommand(
                        token.getSubject() == null ? "" : token.getSubject(), sid == null ? "" : sid));
                AuditLog.backChannelLogout(sid != null);
            }
        };
    }

    /** {@code 200 {"redirectUri": ...}} for the SPA's XHR, otherwise the {@code 303} redirect (SPRING-SEC-33). */
    static JsonAwareLogoutSuccessHandler logoutSuccess(
            org.springframework.security.oauth2.client.registration.ClientRegistrationRepository registrations,
            JsonMapper mapper) {
        JsonAwareLogoutSuccessHandler handler = new JsonAwareLogoutSuccessHandler(registrations, mapper);
        handler.setPostLogoutRedirectUri("{baseUrl}/");
        return handler;
    }

    static final class JsonAwareLogoutSuccessHandler
            extends org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler {

        private final JsonMapper mapper;

        JsonAwareLogoutSuccessHandler(
                org.springframework.security.oauth2.client.registration.ClientRegistrationRepository registrations,
                JsonMapper mapper) {
            super(registrations);
            this.mapper = mapper;
        }

        @Override
        public void onLogoutSuccess(
                HttpServletRequest request, HttpServletResponse response, @Nullable Authentication authentication)
                throws IOException {
            String target = determineTargetUrl(request, response, authentication);
            if (acceptsJson(request)) {
                response.setStatus(HttpStatus.OK.value());
                response.setContentType("application/json");
                response.setHeader("Cache-Control", "no-store");
                mapper.writeValue(response.getOutputStream(), java.util.Map.of("redirectUri", target));
            } else {
                response.setStatus(HttpStatus.SEE_OTHER.value());
                response.setHeader("Location", target);
            }
        }

        private static boolean acceptsJson(HttpServletRequest request) {
            String accept = request.getHeader("Accept");
            return accept != null && accept.contains("application/json");
        }
    }
}
