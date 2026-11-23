package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Query: the items of one list of the caller. */
public record ListItemsQuery(Caller caller, UUID listId) {

    public ListItemsQuery {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }
}
