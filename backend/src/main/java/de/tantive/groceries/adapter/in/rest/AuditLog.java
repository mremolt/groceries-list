package de.tantive.groceries.adapter.in.rest;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Security events as structured log events (SPRING-SEC-22). Only a pseudonymous account id and fixed codes are logged:
 * never tokens, e-mail addresses, names, IdP subjects or session ids (SPRING-LOG-08, DP-TEL-01, SEC-AUD-02).
 */
public final class AuditLog {

    private static final Logger AUDIT = LoggerFactory.getLogger("audit.security");

    private AuditLog() {}

    static void loginSucceeded(UUID userId) {
        AUDIT.atInfo()
                .addKeyValue("event", "login.success")
                .addKeyValue("userId", userId)
                .log("Security event");
    }

    static void loginFailed(String reason) {
        AUDIT.atWarn()
                .addKeyValue("event", "login.failure")
                .addKeyValue("reason", reason)
                .log("Security event");
    }

    static void loggedOut(UUID userId) {
        AUDIT.atInfo()
                .addKeyValue("event", "logout")
                .addKeyValue("userId", userId)
                .log("Security event");
    }

    static void backChannelLogout(boolean bySid) {
        AUDIT.atInfo()
                .addKeyValue("event", "logout.back-channel")
                .addKeyValue("scope", bySid ? "sid" : "subject")
                .log("Security event");
    }

    /** A person asked for a list they may not see (or that does not exist: the answer is the same, BR-01). */
    static void listAccessRefused(UUID userId) {
        AUDIT.atWarn()
                .addKeyValue("event", "access.refused")
                .addKeyValue("resource", "list")
                .addKeyValue("userId", userId)
                .log("Security event");
    }

    /** A person became a member through a share link (BR-06). Never the token (NFR-SEC-05, SEC-AUD-02). */
    public static void listJoined(UUID userId) {
        AUDIT.atInfo()
                .addKeyValue("event", "list.joined")
                .addKeyValue("userId", userId)
                .log("Security event");
    }

    /** A member replaced the share link; the previous one is dead (BR-06). */
    public static void shareLinkRenewed(UUID userId) {
        AUDIT.atInfo()
                .addKeyValue("event", "share-link.renewed")
                .addKeyValue("userId", userId)
                .log("Security event");
    }

    /** An unknown, renewed or malformed token was presented; {@code userId} is null for a visitor without a session. */
    static void shareLinkRefused(@org.jspecify.annotations.Nullable UUID userId) {
        var event = AUDIT.atWarn().addKeyValue("event", "share-link.refused");
        if (userId != null) {
            event = event.addKeyValue("userId", userId);
        }
        event.log("Security event");
    }
}
