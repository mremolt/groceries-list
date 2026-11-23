package de.tantive.groceries.domain;

/** The item does not exist (any more) in a list the caller may see (FR-SYNC-02 AC3). */
public final class ItemNotFoundException extends NotFoundException {

    public ItemNotFoundException() {
        super("ITEM_NOT_FOUND", "Dieser Artikel wurde inzwischen gelöscht.");
    }
}
