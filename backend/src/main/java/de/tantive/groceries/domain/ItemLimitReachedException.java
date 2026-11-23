package de.tantive.groceries.domain;

/** The list already has the maximum number of items (BR-12). */
public final class ItemLimitReachedException extends ConflictException {

    public ItemLimitReachedException() {
        super("ITEM_LIMIT_REACHED", "Diese Liste hat die maximale Anzahl von 500 Artikeln erreicht.");
    }
}
