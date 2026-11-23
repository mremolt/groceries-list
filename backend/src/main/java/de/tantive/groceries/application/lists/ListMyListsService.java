package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.ListMyListsQuery;
import de.tantive.groceries.ports.in.ListMyListsUseCase;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.stereotype.UseCase;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional(readOnly = true)
class ListMyListsService implements ListMyListsUseCase {

    private final ListSummaryPort summaries;

    ListMyListsService(ListSummaryPort summaries) {
        this.summaries = summaries;
    }

    @Override
    public List<ListSummary> listMyLists(ListMyListsQuery query) {
        return summaries.findSummariesOf(query.caller().userId());
    }
}
