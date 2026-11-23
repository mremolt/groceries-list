package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;
import java.util.UUID;

/** Input of RenewShareLink. */
public record RenewShareLinkCommand(Caller caller, UUID listId) {

    public RenewShareLinkCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
    }
}
