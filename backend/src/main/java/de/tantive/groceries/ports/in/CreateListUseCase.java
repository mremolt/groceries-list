package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListSummary;

/** BR-01..02, BR-12: a user creates a list and becomes its only member. */
public interface CreateListUseCase {

    ListSummary createList(CreateListCommand command);
}
