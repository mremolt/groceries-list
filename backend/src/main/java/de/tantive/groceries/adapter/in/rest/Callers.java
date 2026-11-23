package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.domain.Caller;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;

/** Builds the {@link Caller} from the authenticated session, in one place (SPRING-SEC-39); never returns null. */
public final class Callers {

    private Callers() {}

    public static Caller from(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AppOidcUser user) {
            return user.toCaller();
        }
        throw new AuthenticationCredentialsNotFoundException("No application session");
    }
}
