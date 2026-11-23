package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.domain.Caller;
import java.util.Collection;
import java.util.Objects;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

/**
 * The logged-in person: the OIDC user plus the id and profile of the product's own account. It lives in the session, so it
 * stays serializable (SPRING-SEC-42 alternative: Java serialization; a framework upgrade may log everyone out, see
 * docs/security/requirements.md).
 */
public final class AppOidcUser extends DefaultOidcUser {

    private static final long serialVersionUID = 1L;

    private final String subject;
    private final UUID userId;
    private final String email;
    private final String displayName;

    public AppOidcUser(
            Collection<? extends GrantedAuthority> authorities,
            OidcIdToken idToken,
            UUID userId,
            String email,
            String displayName) {
        super(authorities, idToken);
        this.subject = Objects.requireNonNull(idToken.getSubject(), "sub");
        this.userId = userId;
        this.email = email;
        this.displayName = displayName;
    }

    /** The one place a {@link Caller} is built from the session (SPRING-SEC-39). */
    public Caller toCaller() {
        return new Caller(userId, subject, email, displayName);
    }
}
