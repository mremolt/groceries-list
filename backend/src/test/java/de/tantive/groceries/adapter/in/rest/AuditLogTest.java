package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.support.People;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/** Security events carry a pseudonymous id and fixed codes only (SPRING-SEC-22, SPRING-LOG-08, SPRING-DP-07). */
@ExtendWith(OutputCaptureExtension.class)
class AuditLogTest {

    @Test
    void logsTheEventAndThePseudonymousIdButNoEmailNameSubjectOrToken(CapturedOutput output) {
        var caller = People.alice();

        AuditLog.loginSucceeded(caller.userId());
        AuditLog.loggedOut(caller.userId());
        AuditLog.loginFailed("invalid_nonce");
        AuditLog.backChannelLogout(true);

        assertThat(output.getAll())
                .contains("login.success", "logout", "login.failure", "logout.back-channel")
                .contains(caller.userId().toString())
                .doesNotContain(caller.email(), caller.displayName(), caller.subject(), "token");
    }
}
