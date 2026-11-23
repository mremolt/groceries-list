package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserEmailTakenException;
import de.tantive.groceries.ports.in.ProvideUserCommand;
import de.tantive.groceries.ports.in.ProvideUserResult;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** London style: the use case with its outgoing ports as test doubles (TEST-ARCH-02). */
class ProvideUserServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadUserPort load = mock(LoadUserPort.class);
    private final SaveUserPort save = mock(SaveUserPort.class);
    private final ProvideUserService service = new ProvideUserService(load, save, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createsTheAccountAtTheFirstLogin() {
        when(load.findBySubject("sub-1")).thenReturn(Optional.empty());
        when(load.existsByEmail("a@example.test")).thenReturn(false);
        when(save.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        ProvideUserResult result = service.provide(new ProvideUserCommand("sub-1", "A@Example.test", "Alice"));

        assertThat(result.email()).isEqualTo("a@example.test");
        assertThat(result.displayName()).isEqualTo("Alice");
        verify(save).save(any(User.class));
    }

    @Test
    void updatesTheLoginTimeOfAKnownSubjectButKeepsTheNameTheProductHoldsWithoutCreatingAnotherAccount() {
        UUID id = UUID.randomUUID();
        User existing = User.register(id, "sub-1", "a@example.test", "Alice", NOW.minusSeconds(3600));
        when(load.findBySubject("sub-1")).thenReturn(Optional.of(existing));
        when(save.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        ProvideUserResult result = service.provide(new ProvideUserCommand("sub-1", "a@example.test", "Alice N."));

        assertThat(result.userId()).isEqualTo(id);
        // FR-SET-01: a name chosen in the product is not overwritten by the (older) claim of the identity provider
        assertThat(result.displayName()).isEqualTo("Alice");
    }

    @Test
    void neverLinksAnExistingAccountByEmailAlone() {
        when(load.findBySubject("sub-2")).thenReturn(Optional.empty());
        when(load.existsByEmail("a@example.test")).thenReturn(true);

        assertThatThrownBy(() -> service.provide(new ProvideUserCommand("sub-2", "a@example.test", "Mallory")))
                .isInstanceOf(UserEmailTakenException.class);
        verify(save, never()).save(any());
    }
}
