package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Item;

/** FR-ITEM-01: any member adds an item at the end of the open items. */
public interface AddItemUseCase {

    Item addItem(AddItemCommand command);
}
