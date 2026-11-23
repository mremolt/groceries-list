package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Query: the share token of a list the caller is a member of. */
public record GetShareLinkQuery(Caller caller, UUID listId) {

    public GetShareLinkQuery {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }
}
