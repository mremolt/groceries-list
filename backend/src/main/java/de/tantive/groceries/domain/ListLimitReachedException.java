package de.tantive.groceries.domain;

/** The user already has the maximum number of lists (BR-12). */
public final class ListLimitReachedException extends ConflictException {

    public ListLimitReachedException() {
        super("LIST_LIMIT_REACHED", "Du hast die maximale Anzahl von 100 Listen erreicht.");
    }
}
