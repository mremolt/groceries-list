package de.tantive.groceries.application.items;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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
class UpdateItemServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort lists = mock(LoadListPort.class);
    private final ItemPort items = mock(ItemPort.class);
    private final UpdateItemService service = new UpdateItemService(lists, items, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, NOW);

    private void bobIsMember() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        when(lists.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.of(list));
    }

    @Test
    void aMemberChecksAnItem() {
        bobIsMember();
        UUID itemId = UUID.randomUUID();
        Item done = new Item(itemId, ItemText.of("Milch"), true, NOW, 1);
        when(items.update(listId, itemId, null, true, NOW)).thenReturn(Optional.of(done));

        assertThat(service.updateItem(new UpdateItemCommand(People.bob(), listId, itemId, null, true)))
                .isEqualTo(done);
    }

    @Test
    void aGoneItemIsNotFound() {
        bobIsMember();
        UUID itemId = UUID.randomUUID();
        when(items.update(any(), any(), any(), any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateItem(new UpdateItemCommand(People.bob(), listId, itemId, null, true)))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingIsChanged() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateItem(
                        new UpdateItemCommand(People.bob(), listId, UUID.randomUUID(), ItemText.of("X"), null)))
                .isInstanceOf(ListNotFoundException.class);
        verifyNoInteractions(items);
    }

    @Test
    void aCommandWithoutAnyChangeIsInvalid() {
        assertThatThrownBy(() -> new UpdateItemCommand(People.bob(), listId, UUID.randomUUID(), null, null))
                .isInstanceOfSatisfying(
                        DomainValidationException.class,
                        e -> assertThat(e.code()).isEqualTo("CHANGE_REQUIRED"));
    }
}
