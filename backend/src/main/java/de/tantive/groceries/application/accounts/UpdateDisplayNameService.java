package de.tantive.groceries.application.accounts;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserNotFoundException;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.UpdateDisplayNameCommand;
import de.tantive.groceries.ports.in.UpdateDisplayNameUseCase;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

/** FR-SET-01. The account is the caller's own, taken from the session; there is no id in the request (SPRING-SEC-16). */
@UseCase
@Transactional
class UpdateDisplayNameService implements UpdateDisplayNameUseCase {

    private final LoadUserPort load;
    private final SaveUserPort save;

    UpdateDisplayNameService(LoadUserPort load, SaveUserPort save) {
        this.load = load;
        this.save = save;
    }

    @Override
    public CurrentUser updateDisplayName(UpdateDisplayNameCommand command) {
        User user = load.findById(command.caller().userId()).orElseThrow(UserNotFoundException::new);
        User stored = save.save(user.renamed(command.displayName()));
        return new CurrentUser(stored.id(), stored.displayName(), stored.email());
    }
}
