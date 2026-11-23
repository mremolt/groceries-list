package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.RenameListCommand;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.support.People;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class RenameListServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final LoadListPort load = mock(LoadListPort.class);
    private final SaveListPort save = mock(SaveListPort.class);
    private final ListSummaryPort summaries = mock(ListSummaryPort.class);
    private final RenameListService service =
            new RenameListService(load, save, summaries, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID listId = UUID.randomUUID();

    @Test
    void aMemberRenamesTheListAndGetsTheFreshSummary() {
        ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, NOW.minusSeconds(60));
        when(load.findForMember(listId, People.BOB_ID)).thenReturn(Optional.of(list));
        ListSummary fresh = new ListSummary(listId, "WG-Vorrat", 3, 5);
        when(summaries.findSummaryOf(People.BOB_ID, listId)).thenReturn(Optional.of(fresh));

        ListSummary result =
                service.renameList(new RenameListCommand(People.bob(), listId, ListName.of(" WG-Vorrat ")));

        verify(save).rename(listId, ListName.of("WG-Vorrat"), NOW);
        assertThat(result).isEqualTo(fresh);
    }

    @Test
    void aNonMemberGetsNotFoundAndNothingIsChanged() {
        when(load.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.renameList(new RenameListCommand(People.bob(), listId, ListName.of("Mein"))))
                .isInstanceOf(ListNotFoundException.class);

        verify(save, never()).rename(any(), any(), any());
    }
}
