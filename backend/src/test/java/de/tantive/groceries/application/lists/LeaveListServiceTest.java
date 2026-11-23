package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.LeaveListCommand;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class LeaveListServiceTest {

    private final LoadListPort load = mock(LoadListPort.class);
    private final MembershipPort memberships = mock(MembershipPort.class);
    private final DeleteListPort delete = mock(DeleteListPort.class);
    private final LeaveListService service = new LeaveListService(load, memberships, delete);
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, Instant.EPOCH);

    @Test
    void leavingWhileOthersRemainKeepsTheList() {
        when(load.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        when(memberships.countMembers(listId)).thenReturn(1);

        service.leaveList(new LeaveListCommand(People.bob(), listId));

        verify(memberships).remove(listId, People.BOB_ID);
        verify(delete, never()).delete(any());
    }

    @Test
    void theLastMemberLeavingDeletesTheList() {
        when(load.findForMemberLocked(listId, People.ALICE_ID)).thenReturn(Optional.of(list));
        when(memberships.countMembers(listId)).thenReturn(0);

        service.leaveList(new LeaveListCommand(People.alice(), listId));

        var order = inOrder(load, memberships, delete);
        order.verify(load).findForMemberLocked(listId, People.ALICE_ID); // locks the list row before it counts
        order.verify(memberships).remove(listId, People.ALICE_ID);
        order.verify(memberships).countMembers(listId);
        order.verify(delete).delete(listId);
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingChanges() {
        when(load.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.leaveList(new LeaveListCommand(People.bob(), listId)))
                .isInstanceOf(ListNotFoundException.class);

        verify(memberships, never()).remove(any(), any());
        verify(delete, never()).delete(any());
    }
}
