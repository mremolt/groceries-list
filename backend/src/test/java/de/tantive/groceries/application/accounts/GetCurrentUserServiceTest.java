package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserNotFoundException;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.GetCurrentUserQuery;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class GetCurrentUserServiceTest {

    private final LoadUserPort load = mock(LoadUserPort.class);
    private final GetCurrentUserService service = new GetCurrentUserService(load);

    @Test
    void returnsTheProfileOfTheCaller() {
        User alice = User.register(People.ALICE_ID, "sub-alice", "alice@example.test", "Alice Example", Instant.EPOCH);
        when(load.findById(People.ALICE_ID)).thenReturn(Optional.of(alice));

        CurrentUser me = service.currentUser(new GetCurrentUserQuery(People.alice()));

        assertThat(me.id()).isEqualTo(People.ALICE_ID);
        assertThat(me.email()).isEqualTo("alice@example.test");
        assertThat(me.displayName()).isEqualTo("Alice Example");
    }

    @Test
    void answersNotFoundWhenTheAccountNoLongerExists() {
        when(load.findById(People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.currentUser(new GetCurrentUserQuery(People.bob())))
                .isInstanceOf(UserNotFoundException.class);
    }
}
