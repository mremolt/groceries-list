package de.tantive.groceries.adapter.in.rest;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Logged-in test people as the BFF session would hold them (an {@link AppOidcUser} in an OAuth2 authentication). */
public final class AppSessions {

    private AppSessions() {}

    public static RequestPostProcessor alice() {
        return session("sub-alice", People.ALICE_ID, "alice@example.test", "Alice Example");
    }

    public static RequestPostProcessor bob() {
        return session("sub-bob", People.BOB_ID, "bob@example.test", "Bob Example");
    }

    private static RequestPostProcessor session(String subject, java.util.UUID id, String email, String name) {
        OidcIdToken token = OidcIdToken.withTokenValue("test-token")
                .subject(subject)
                .issuedAt(Instant.parse("2026-11-23T09:00:00Z"))
                .expiresAt(Instant.parse("2026-11-23T11:00:00Z"))
                .build();
        var authority = new SimpleGrantedAuthority("OIDC_USER");
        AppOidcUser user = new AppOidcUser(List.of(authority), token, id, email, name);
        return authentication(new OAuth2AuthenticationToken(user, List.of(authority), "keycloak"));
    }
}
