package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Query: one list of the caller. */
public record GetListQuery(Caller caller, UUID listId) {

    public GetListQuery {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }
}
