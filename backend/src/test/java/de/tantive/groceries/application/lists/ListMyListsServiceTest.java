package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.ListMyListsQuery;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.support.People;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class ListMyListsServiceTest {

    private final ListSummaryPort summaries = mock(ListSummaryPort.class);
    private final ListMyListsService service = new ListMyListsService(summaries);

    @Test
    void returnsTheListsOfTheCallerInTheOrderTheStoreGivesThem() {
        ListSummary first = new ListSummary(UUID.randomUUID(), "Wocheneinkauf", 3, 7);
        ListSummary second = new ListSummary(UUID.randomUUID(), "WG-Vorrat", 0, 1);
        when(summaries.findSummariesOf(People.ALICE_ID)).thenReturn(List.of(first, second));

        assertThat(service.listMyLists(new ListMyListsQuery(People.alice()))).containsExactly(first, second);
    }

    @Test
    void anotherUsersListsNeverAppear() {
        ListSummary aliceList = new ListSummary(UUID.randomUUID(), "Nur Alice", 1, 1);
        when(summaries.findSummariesOf(People.ALICE_ID)).thenReturn(List.of(aliceList));
        when(summaries.findSummariesOf(People.BOB_ID)).thenReturn(List.of());

        assertThat(service.listMyLists(new ListMyListsQuery(People.bob()))).isEmpty();
        verify(summaries, never()).findSummariesOf(People.ALICE_ID);
    }
}
