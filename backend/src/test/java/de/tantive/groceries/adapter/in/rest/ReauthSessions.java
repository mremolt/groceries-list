package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.http.HttpSession;
import java.time.Instant;

/** Test access to the package-private part of {@link ReauthSession}: a session that was re-authenticated at {@code at}. */
public final class ReauthSessions {

    private ReauthSessions() {}

    public static void confirm(HttpSession session, Instant at) {
        ReauthSession.confirm(session, at);
    }
}
