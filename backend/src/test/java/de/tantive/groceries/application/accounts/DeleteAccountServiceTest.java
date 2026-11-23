package de.tantive.groceries.application.accounts;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ReauthenticationRequiredException;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.DeleteAccountCommand;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.DeleteUserPort;
import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import de.tantive.groceries.support.People;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionOperations;

/** London style. The transaction is a pass-through here; the real one is asserted in DeleteAccountIT (DP-TEST-01). */
@Tag("cross-user")
class DeleteAccountServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort loadLists = mock(LoadListPort.class);
    private final MembershipPort memberships = mock(MembershipPort.class);
    private final DeleteListPort deleteList = mock(DeleteListPort.class);
    private final DeleteUserPort deleteUser = mock(DeleteUserPort.class);
    private final IdpSessionPort sessions = mock(IdpSessionPort.class);
    private final PendingIdpDeletionPort pending = mock(PendingIdpDeletionPort.class);
    private final IdentityProviderPort identityProvider = mock(IdentityProviderPort.class);
    private final DeleteAccountService service = new DeleteAccountService(
            TransactionOperations.withoutTransaction(),
            loadLists,
            memberships,
            deleteList,
            deleteUser,
            sessions,
            pending,
            identityProvider,
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID shared = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private final UUID alone = UUID.fromString("22222222-2222-4222-8222-222222222222");

    private void alicesLists() {
        when(memberships.listIdsOf(People.ALICE_ID)).thenReturn(List.of(shared, alone));
        when(loadLists.findForMemberLocked(shared, People.ALICE_ID)).thenReturn(Optional.of(mock(ShoppingList.class)));
        when(loadLists.findForMemberLocked(alone, People.ALICE_ID)).thenReturn(Optional.of(mock(ShoppingList.class)));
        when(memberships.countMembers(shared)).thenReturn(1);
        when(memberships.countMembers(alone)).thenReturn(0);
    }

    @Test
    void refusesWithoutAReauthentication() {
        assertThatThrownBy(() -> service.deleteAccount(new DeleteAccountCommand(People.alice(), null)))
                .isInstanceOf(ReauthenticationRequiredException.class);

        verifyNoInteractions(memberships, deleteUser, sessions, identityProvider, pending);
    }

    @Test
    void refusesAReauthenticationOlderThanFiveMinutes() {
        assertThatThrownBy(() ->
                        service.deleteAccount(new DeleteAccountCommand(People.alice(), NOW.minusSeconds(5 * 60 + 1))))
                .isInstanceOf(ReauthenticationRequiredException.class);

        verifyNoInteractions(memberships, deleteUser, identityProvider);
    }

    @Test
    void refusesAReauthenticationFromTheFuture() {
        assertThatThrownBy(() -> service.deleteAccount(new DeleteAccountCommand(People.alice(), NOW.plusSeconds(60))))
                .isInstanceOf(ReauthenticationRequiredException.class);
    }

    @Test
    void leavesSharedListsDeletesListsWithoutMembersThenTheAccountAndTheSessions() throws Exception {
        alicesLists();

        service.deleteAccount(new DeleteAccountCommand(People.alice(), NOW.minusSeconds(60)));

        var order = inOrder(memberships, deleteList, deleteUser, sessions, pending, identityProvider);
        order.verify(memberships).lockAndCountListsOf(People.ALICE_ID);
        order.verify(memberships).remove(shared, People.ALICE_ID);
        order.verify(memberships).remove(alone, People.ALICE_ID);
        order.verify(deleteList).delete(alone);
        order.verify(deleteUser).delete(People.ALICE_ID);
        order.verify(sessions).endBySubject("sub-alice");
        order.verify(pending).add("sub-alice", NOW);
        order.verify(identityProvider).deleteUser("sub-alice");
        order.verify(pending).remove("sub-alice");
        verify(deleteList, never()).delete(shared);
    }

    @Test
    void theAccountIsGoneEvenWhenTheIdentityProviderIsDown() throws Exception {
        alicesLists();
        doThrow(new IdentityProviderUnavailableException("down"))
                .when(identityProvider)
                .deleteUser(any());

        service.deleteAccount(new DeleteAccountCommand(People.alice(), NOW));

        verify(deleteUser).delete(People.ALICE_ID);
        verify(pending).add("sub-alice", NOW);
        verify(pending, never()).remove(any());
    }

    @Test
    void neverTouchesAnotherPersonsLists() throws Exception {
        when(memberships.listIdsOf(People.BOB_ID)).thenReturn(List.of());

        service.deleteAccount(new DeleteAccountCommand(People.bob(), NOW));

        verify(memberships).listIdsOf(People.BOB_ID);
        verify(deleteUser).delete(People.BOB_ID);
        verify(deleteList, never()).delete(any());
        verify(identityProvider, never()).deleteUser("sub-alice");
    }
}
