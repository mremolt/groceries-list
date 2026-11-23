package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.DisplayName;
import java.util.Objects;

/** Input of UpdateDisplayName: the caller sets their own name (FR-SET-01). */
public record UpdateDisplayNameCommand(Caller caller, DisplayName displayName) {

    public UpdateDisplayNameCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(displayName, "displayName");
    }
}
