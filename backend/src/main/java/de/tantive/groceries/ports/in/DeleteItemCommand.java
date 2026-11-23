package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Input of DeleteItem. */
public record DeleteItemCommand(Caller caller, UUID listId, UUID itemId) {

    public DeleteItemCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(itemId, "itemId");
    }
}
