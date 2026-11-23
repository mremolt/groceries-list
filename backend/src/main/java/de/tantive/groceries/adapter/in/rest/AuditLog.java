package de.tantive.groceries.adapter.in.rest;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Security events as structured log events (SPRING-SEC-22). Only a pseudonymous account id and fixed codes are logged:
 * never tokens, e-mail addresses, names, IdP subjects or session ids (SPRING-LOG-08, DP-TEL-01, SEC-AUD-02).
 */
final class AuditLog {

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
}
