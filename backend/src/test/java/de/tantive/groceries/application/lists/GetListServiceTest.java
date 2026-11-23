package de.tantive.groceries.application.lists;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.GetListQuery;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.support.People;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class GetListServiceTest {

    private final ListSummaryPort summaries = mock(ListSummaryPort.class);
    private final GetListService service = new GetListService(summaries);
    private final UUID listOfAlice = UUID.randomUUID();

    @Test
    void aMemberGetsTheirList() {
        ListSummary summary = new ListSummary(listOfAlice, "Wocheneinkauf", 2, 4);
        when(summaries.findSummaryOf(People.ALICE_ID, listOfAlice)).thenReturn(Optional.of(summary));

        assertThat(service.getList(new GetListQuery(People.alice(), listOfAlice)))
                .isEqualTo(summary);
    }

    @Test
    void anotherUsersListIsNotFoundExactlyLikeAnUnknownOne() {
        when(summaries.findSummaryOf(People.BOB_ID, listOfAlice)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getList(new GetListQuery(People.bob(), listOfAlice)))
                .isInstanceOf(ListNotFoundException.class);
    }
}
