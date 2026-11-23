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
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class ClearCheckedItemsServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort lists = mock(LoadListPort.class);
    private final ItemPort items = mock(ItemPort.class);
    private final ClearCheckedItemsService service =
            new ClearCheckedItemsService(lists, items, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, NOW);

    private void bobIsMember() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        when(lists.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.of(list));
    }

    @Test
    void aMemberRemovesTheGivenCheckedItems() {
        bobIsMember();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(items.deleteChecked(listId, Set.of(a, b), NOW)).thenReturn(1);

        assertThat(service.clearCheckedItems(ClearCheckedItemsCommand.of(People.bob(), listId, List.of(a, b))))
                .isEqualTo(1);
    }

    @Test
    void noIdsMeansNothingToDo() {
        bobIsMember();

        assertThat(service.clearCheckedItems(ClearCheckedItemsCommand.of(People.bob(), listId, List.of())))
                .isZero();
        verifyNoInteractions(items);
    }

    @Test
    void moreThanFiveHundredIdsAreRefused() {
        List<UUID> ids =
                java.util.stream.Stream.generate(UUID::randomUUID).limit(501).toList();

        assertThatThrownBy(() -> ClearCheckedItemsCommand.of(People.bob(), listId, ids))
                .isInstanceOf(DomainValidationException.class);
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingIsDeleted() {
        when(lists.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.clearCheckedItems(
                        ClearCheckedItemsCommand.of(People.bob(), listId, List.of(UUID.randomUUID()))))
                .isInstanceOf(ListNotFoundException.class);
        verifyNoInteractions(items);
    }
}
