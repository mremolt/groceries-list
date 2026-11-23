package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.GetListQuery;
import de.tantive.groceries.ports.in.GetListUseCase;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional(readOnly = true)
class GetListService implements GetListUseCase {

    private final ListSummaryPort summaries;

    GetListService(ListSummaryPort summaries) {
        this.summaries = summaries;
    }

    @Override
    public ListSummary getList(GetListQuery query) {
        // the store only finds lists the caller is a member of: non-members and unknown ids look the same (BR-01)
        return summaries.findSummaryOf(query.caller().userId(), query.listId()).orElseThrow(ListNotFoundException::new);
    }
}
