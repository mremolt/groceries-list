package de.tantive.groceries.application.accounts;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserEmailTakenException;
import de.tantive.groceries.ports.in.ProvideUserCommand;
import de.tantive.groceries.ports.in.ProvideUserResult;
import de.tantive.groceries.ports.in.ProvideUserUseCase;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional
class ProvideUserService implements ProvideUserUseCase {

    private final LoadUserPort load;
    private final SaveUserPort save;
    private final Clock clock;

    ProvideUserService(LoadUserPort load, SaveUserPort save, Clock clock) {
        this.load = load;
        this.save = save;
        this.clock = clock;
    }

    @Override
    public ProvideUserResult provide(ProvideUserCommand command) {
        User user = load.findBySubject(command.subject())
                .map(existing -> existing.loggedIn(clock.instant()))
                .orElseGet(() -> register(command));
        User stored = save.save(user);
        return new ProvideUserResult(stored.id(), stored.email(), stored.displayName());
    }

    private User register(ProvideUserCommand command) {
        User candidate = User.register(
                UUID.randomUUID(), command.subject(), command.email(), command.displayName(), clock.instant());
        if (load.existsByEmail(candidate.email())) {
            throw new UserEmailTakenException();
        }
        return candidate;
    }
}
