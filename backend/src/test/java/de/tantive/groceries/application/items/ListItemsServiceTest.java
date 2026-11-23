package de.tantive.groceries.application.items;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.*;
import de.tantive.groceries.ports.in.*;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class ListItemsServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort lists = mock(LoadListPort.class);
    private final ItemPort items = mock(ItemPort.class);
    private final ListItemsService service = new ListItemsService(lists, items);
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, NOW);

    private void bobIsMember() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        when(lists.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.of(list));
    }

    @Test
    void aMemberReadsTheItemsInTheOrderOfThePort() {
        bobIsMember();
        List<Item> all = List.of(Item.create(UUID.randomUUID(), ItemText.of("Milch"), NOW));
        when(items.findAllOf(listId)).thenReturn(all);

        assertThat(service.listItems(new ListItemsQuery(People.bob(), listId))).isEqualTo(all);
    }

    @Test
    void aNonMemberGetsNotFoundAndReadsNothing() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listItems(new ListItemsQuery(People.bob(), listId)))
                .isInstanceOf(ListNotFoundException.class);
        verifyNoInteractions(items);
    }
}
