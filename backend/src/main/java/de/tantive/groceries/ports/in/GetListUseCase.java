package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListSummary;

/** Query: one list of the caller; not found for non-members (BR-01). */
public interface GetListUseCase {

    ListSummary getList(GetListQuery query);
}
