package de.tantive.groceries.application.accounts;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserNotFoundException;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.GetCurrentUserQuery;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional(readOnly = true)
class GetCurrentUserService implements GetCurrentUserUseCase {

    private final LoadUserPort load;

    GetCurrentUserService(LoadUserPort load) {
        this.load = load;
    }

    @Override
    public CurrentUser currentUser(GetCurrentUserQuery query) {
        User user = load.findById(query.caller().userId()).orElseThrow(UserNotFoundException::new);
        return new CurrentUser(user.id(), user.displayName(), user.email());
    }
}
