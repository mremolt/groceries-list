package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Item;

/** FR-ITEM-02/03: any member checks, unchecks or edits an item; not found when the item is gone (FR-SYNC-02 AC3). */
public interface UpdateItemUseCase {

    Item updateItem(UpdateItemCommand command);
}
