package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.http.HttpServletRequest;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Starts the login. The request parameter {@code prompt} is passed to the IdP for exactly one value, {@code create}
 * (sign-up page, ADR 0003); anything else is dropped, so a crafted link cannot steer the IdP.
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
        if (resolved == null || !"create".equals(request.getParameter("prompt"))) {
            return resolved;
        }
        return OAuth2AuthorizationRequest.from(resolved)
                .additionalParameters(parameters -> parameters.put("prompt", "create"))
                .build();
    }
}
