package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

/**
 * The proof, kept in the server-side session, that the person logged in again at the identity provider just now
 * (FR-SET-04, ADR 0003). The flow starts with {@code /oauth2/authorization/keycloak?reauth=1}: the start remembers
 * whose login is expected, the success handler confirms it only for the same IdP subject and a fresh {@code auth_time}.
 * Nothing of this travels in a URL or in browser storage.
 */
public final class ReauthSession {

    private static final String EXPECTED_SUBJECT = "app.reauth.expected-subject";
    private static final String CONFIRMED_AT = "app.reauth.confirmed-at";

    private ReauthSession() {}

    static void expect(HttpSession session, String subject) {
        session.setAttribute(EXPECTED_SUBJECT, subject);
    }

    /** Reads and forgets the subject whose re-authentication was started. */
    static @Nullable String takeExpected(HttpSession session) {
        Object subject = session.getAttribute(EXPECTED_SUBJECT);
        session.removeAttribute(EXPECTED_SUBJECT);
        return subject instanceof String text ? text : null;
    }

    static void confirm(HttpSession session, Instant at) {
        session.setAttribute(CONFIRMED_AT, at);
    }

    static void clear(HttpSession session) {
        session.removeAttribute(CONFIRMED_AT);
    }

    /** When this session was re-authenticated; {@code null} when it never was. */
    public static @Nullable Instant confirmedAt(@Nullable HttpSession session) {
        return session != null && session.getAttribute(CONFIRMED_AT) instanceof Instant at ? at : null;
    }
}
