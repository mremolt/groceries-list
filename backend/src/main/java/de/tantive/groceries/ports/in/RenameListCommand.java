package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ListName;
import java.util.Objects;
import java.util.UUID;

/** Input of RenameList: a member sets a new name (last write wins, ADR 0007). */
public record RenameListCommand(Caller caller, UUID listId, ListName name) {

    public RenameListCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(name, "name");
    }
}
