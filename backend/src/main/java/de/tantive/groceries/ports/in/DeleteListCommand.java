package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Input of DeleteList: the caller acts on a list by its id; membership is checked by the use case (BR-01). */
public record DeleteListCommand(Caller caller, UUID listId) {

    public DeleteListCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }
}
