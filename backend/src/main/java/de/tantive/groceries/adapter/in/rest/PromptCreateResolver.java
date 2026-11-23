package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.http.HttpServletRequest;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Starts the login. The request parameter {@code prompt} is passed to the IdP for exactly one value, {@code create}
 * (sign-up page, ADR 0003), and {@code reauth=1} asks a logged-in person to log in again; anything else is dropped,
 * so a crafted link cannot steer the IdP.
 */
final class PromptCreateResolver implements OAuth2AuthorizationRequestResolver {

    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    PromptCreateResolver(ClientRegistrationRepository registrations) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        // The BFF is a confidential client and still uses PKCE (SPRING-SEC-38).
        this.delegate.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(request, delegate.resolve(request));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return customize(request, delegate.resolve(request, clientRegistrationId));
    }

    private static @Nullable OAuth2AuthorizationRequest customize(
            HttpServletRequest request, @Nullable OAuth2AuthorizationRequest resolved) {
        if (resolved == null) {
            return null;
        }
        if ("1".equals(request.getParameter("reauth"))) {
            return reauthentication(request, resolved);
        }
        if (!"create".equals(request.getParameter("prompt"))) {
            return resolved;
        }
        return OAuth2AuthorizationRequest.from(resolved)
                .additionalParameters(parameters -> parameters.put("prompt", "create"))
                .build();
    }

    /**
     * FR-SET-04: a logged-in person logs in again to confirm a destructive action. The IdP is told to ask for the
     * credentials ({@code prompt=login}, {@code max_age=0}); the person's subject is remembered in the session so the
     * success handler can tell a re-authentication from a login as somebody else. Without a session it is a plain login.
     */
    private static OAuth2AuthorizationRequest reauthentication(
            HttpServletRequest request, OAuth2AuthorizationRequest resolved) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AppOidcUser user)) {
            return resolved;
        }
        ReauthSession.expect(request.getSession(), user.toCaller().subject());
        return OAuth2AuthorizationRequest.from(resolved)
                .additionalParameters(parameters -> {
                    parameters.put("prompt", "login");
                    parameters.put("max_age", "0");
                })
                .build();
    }
}
