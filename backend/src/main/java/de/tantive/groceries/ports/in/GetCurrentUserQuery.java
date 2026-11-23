package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;

/** The caller asks for their own profile. */
public record GetCurrentUserQuery(Caller caller) {

    public GetCurrentUserQuery {
        Objects.requireNonNull(caller, "caller");
    }
}
