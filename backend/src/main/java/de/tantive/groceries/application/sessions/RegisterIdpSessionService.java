package de.tantive.groceries.application.sessions;

import de.tantive.groceries.ports.in.RegisterIdpSessionCommand;
import de.tantive.groceries.ports.in.RegisterIdpSessionUseCase;
import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.time.Duration;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional
class RegisterIdpSessionService implements RegisterIdpSessionUseCase {

    private final IdpSessionPort sessions;
    private final Clock clock;
    /** The absolute session lifetime of ADR 0002; rows recorded earlier belong to dead sessions. */
    static final Duration ABSOLUTE_LIFETIME = Duration.ofDays(30);

    RegisterIdpSessionService(IdpSessionPort sessions, Clock clock) {
        this.sessions = sessions;
        this.clock = clock;
    }

    @Override
    public void register(RegisterIdpSessionCommand command) {
        var now = clock.instant();
        sessions.record(command.sessionId(), command.sid(), command.subject(), now);
        sessions.purgeRecordedBefore(now.minus(ABSOLUTE_LIFETIME));
    }
}
