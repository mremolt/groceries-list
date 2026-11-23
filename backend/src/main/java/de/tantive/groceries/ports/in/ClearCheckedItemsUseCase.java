package de.tantive.groceries.ports.in;

/** FR-ITEM-05: removes those of the given items that are still checked; returns how many were removed. */
public interface ClearCheckedItemsUseCase {

    int clearCheckedItems(ClearCheckedItemsCommand command);
}
