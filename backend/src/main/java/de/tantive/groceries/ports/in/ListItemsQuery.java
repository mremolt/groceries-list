package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** Query: the items of one list of the caller; {@code knownRevision} is the revision the caller already holds, if any. */
public record ListItemsQuery(
        Caller caller, UUID listId, @Nullable Long knownRevision) {

    public ListItemsQuery {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }

    public ListItemsQuery(Caller caller, UUID listId) {
        this(caller, listId, null);
    }
}
