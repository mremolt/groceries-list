package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.DisplayName;
import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserNotFoundException;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.UpdateDisplayNameCommand;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** The caller changes only their own name: the id comes from the session, never from the request (SPRING-SEC-16). */
@Tag("cross-user")
class UpdateDisplayNameServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadUserPort load = mock(LoadUserPort.class);
    private final SaveUserPort save = mock(SaveUserPort.class);
    private final UpdateDisplayNameService service = new UpdateDisplayNameService(load, save);

    @Test
    void changesTheCallersOwnNameAndKeepsTheRest() {
        User alice = User.register(People.ALICE_ID, "sub-alice", "alice@example.test", "Alice Example", NOW);
        when(load.findById(People.ALICE_ID)).thenReturn(Optional.of(alice));
        when(save.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        CurrentUser result =
                service.updateDisplayName(new UpdateDisplayNameCommand(People.alice(), DisplayName.of(" Alice N. ")));

        assertThat(result).isEqualTo(new CurrentUser(People.ALICE_ID, "Alice N.", "alice@example.test"));
        verify(save).save(alice.renamed(DisplayName.of("Alice N.")));
    }

    @Test
    void doesNotTouchAnotherPersonsAccount() {
        User alice = User.register(People.ALICE_ID, "sub-alice", "alice@example.test", "Alice Example", NOW);
        User bob = User.register(People.BOB_ID, "sub-bob", "bob@example.test", "Bob Example", NOW);
        when(load.findById(People.ALICE_ID)).thenReturn(Optional.of(alice));
        when(load.findById(People.BOB_ID)).thenReturn(Optional.of(bob));
        when(save.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        service.updateDisplayName(new UpdateDisplayNameCommand(People.bob(), DisplayName.of("Robert")));

        verify(save).save(bob.renamed(DisplayName.of("Robert")));
        org.mockito.Mockito.verify(save, org.mockito.Mockito.times(1)).save(any());
    }

    @Test
    void aMissingAccountIsNotFound() {
        when(load.findById(People.ALICE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                        service.updateDisplayName(new UpdateDisplayNameCommand(People.alice(), DisplayName.of("X"))))
                .isInstanceOf(UserNotFoundException.class);
    }
}
