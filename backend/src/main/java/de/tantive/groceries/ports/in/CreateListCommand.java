package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ListName;
import java.util.Objects;

/** Input of CreateList; the name is validated when it is built (ARCH-UC-05). */
public record CreateListCommand(Caller caller, ListName name) {

    public CreateListCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(name, "name");
    }
}
