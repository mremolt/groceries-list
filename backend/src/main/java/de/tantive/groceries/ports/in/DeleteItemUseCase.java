package de.tantive.groceries.ports.in;

/** FR-ITEM-04: any member deletes an item without confirmation (BR-11); an item that is already gone is fine. */
public interface DeleteItemUseCase {

    void deleteItem(DeleteItemCommand command);
}
