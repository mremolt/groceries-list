package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ItemText;
import java.util.Objects;
import java.util.UUID;

/** Input of AddItem: a member adds one free-text line. The id is chosen by the server. */
public record AddItemCommand(Caller caller, UUID listId, ItemText text) {

    public AddItemCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(text, "text");
    }
}
