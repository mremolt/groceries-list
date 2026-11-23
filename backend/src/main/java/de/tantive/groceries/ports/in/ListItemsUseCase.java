package de.tantive.groceries.ports.in;

/**
 * The items of a list, oldest first (BR-09), at most 500 (BR-12); not found for non-members (BR-01). A caller that
 * names the current revision gets a not-modified snapshot without any item read (ADR 0006, NFR-PERF-04).
 */
public interface ListItemsUseCase {

    ItemsSnapshot listItems(ListItemsQuery query);
}
