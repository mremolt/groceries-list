package de.tantive.groceries.application.sessions;

import de.tantive.groceries.ports.in.EndIdpSessionsCommand;
import de.tantive.groceries.ports.in.EndIdpSessionsUseCase;
import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional
class EndIdpSessionsService implements EndIdpSessionsUseCase {

    private final IdpSessionPort sessions;

    EndIdpSessionsService(IdpSessionPort sessions) {
        this.sessions = sessions;
    }

    @Override
    public void end(EndIdpSessionsCommand command) {
        if (command.sid().isEmpty()) {
            sessions.endBySubject(command.subject());
        } else {
            sessions.endBySid(command.sid());
        }
    }
}
