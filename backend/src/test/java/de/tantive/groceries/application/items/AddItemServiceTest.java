package de.tantive.groceries.application.items;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.*;
import de.tantive.groceries.ports.in.*;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.support.People;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class AddItemServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort lists = mock(LoadListPort.class);
    private final ItemPort items = mock(ItemPort.class);
    private final AddItemService service = new AddItemService(lists, items, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, NOW);

    private void bobIsMember() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        when(lists.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.of(list));
    }

    @Test
    void aMemberAddsAnOpenItemUnderTheListLock() {
        bobIsMember();
        when(items.countOf(listId)).thenReturn(3);
        when(items.add(any(), any(), any())).thenAnswer(i -> i.getArgument(1));

        Item added = service.addItem(new AddItemCommand(People.bob(), listId, ItemText.of(" Milch ")));

        assertThat(added.text().value()).isEqualTo("Milch");
        assertThat(added.done()).isFalse();
        assertThat(added.createdAt()).isEqualTo(NOW);
        verify(items).add(listId, added, NOW);
    }

    @Test
    void refusesThe501stItem() {
        bobIsMember();
        when(items.countOf(listId)).thenReturn(500);

        assertThatThrownBy(() -> service.addItem(new AddItemCommand(People.bob(), listId, ItemText.of("Eins zu viel"))))
                .isInstanceOf(ItemLimitReachedException.class);
        verify(items, never()).add(any(), any(), any());
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingIsAdded() {
        when(lists.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addItem(new AddItemCommand(People.bob(), listId, ItemText.of("Milch"))))
                .isInstanceOf(ListNotFoundException.class);
        verifyNoInteractions(items);
    }
}
