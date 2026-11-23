package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.domain.ShareToken;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import org.jspecify.annotations.Nullable;

/**
 * The share token that survives the login round trip in the server-side session (ADR 0008, FR-AUTH-06, TS-SEC-01):
 * never in browser storage, never in a URL. A visitor's session is created by the invitation call, so it lives only
 * {@link #LIFETIME} until the login has finished; the normal idle time is restored then.
 */
public final class PendingInvitation {

    /** Long enough for a sign-up and a password reset mail in between (FR-AUTH-06 AC3), short for an abandoned visit. */
    static final Duration LIFETIME = Duration.ofHours(2);

    private static final String TOKEN = "app.pending-invitation";
    private static final String NORMAL_IDLE_SECONDS = "app.pending-invitation.idle";

    private PendingInvitation() {}

    public static void remember(HttpSession session, ShareToken token) {
        if (session.getAttribute(NORMAL_IDLE_SECONDS) == null) {
            session.setAttribute(NORMAL_IDLE_SECONDS, session.getMaxInactiveInterval());
        }
        session.setMaxInactiveInterval((int) LIFETIME.toSeconds());
        session.setAttribute(TOKEN, token.value());
    }

    /** The remembered token as the client would have sent it; empty when none. */
    public static @Nullable String peek(@Nullable HttpSession session) {
        return session != null && session.getAttribute(TOKEN) instanceof String token ? token : null;
    }

    public static boolean isPending(@Nullable HttpSession session) {
        return peek(session) != null;
    }

    /** Forgets the token and gives the session its normal idle time back (it is a login session by now). */
    public static void clear(@Nullable HttpSession session) {
        if (session == null) {
            return;
        }
        session.removeAttribute(TOKEN);
        restoreIdleTime(session);
    }

    /** After the login: the session is a person's session, not a visitor's. The token stays for the join call. */
    static void restoreIdleTime(HttpSession session) {
        if (session.getAttribute(NORMAL_IDLE_SECONDS) instanceof Integer seconds) {
            session.setMaxInactiveInterval(seconds);
            session.removeAttribute(NORMAL_IDLE_SECONDS);
        }
    }
}
