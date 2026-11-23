package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListSummary;
import java.util.List;

/** Query (ARCH-UC-03): the lists of the caller, at most 100 (BR-12), oldest membership first (BR-10). */
public interface ListMyListsUseCase {

    List<ListSummary> listMyLists(ListMyListsQuery query);
}
