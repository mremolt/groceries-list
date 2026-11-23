package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.DeleteListCommand;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class DeleteListServiceTest {

    private final LoadListPort load = mock(LoadListPort.class);
    private final DeleteListPort delete = mock(DeleteListPort.class);
    private final DeleteListService service = new DeleteListService(load, delete);
    private final UUID listId = UUID.randomUUID();

    @Test
    void anyMemberDeletesTheListForEveryone() {
        ShoppingList list = ShoppingList.create(listId, ListName.of("Grillabend"), People.ALICE_ID, Instant.EPOCH);
        when(load.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));

        service.deleteList(new DeleteListCommand(People.bob(), listId));

        verify(delete).delete(listId);
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingIsDeleted() {
        when(load.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteList(new DeleteListCommand(People.bob(), listId)))
                .isInstanceOf(ListNotFoundException.class);

        verify(delete, never()).delete(any());
    }
}
