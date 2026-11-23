package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.util.Objects;

/** Query: all lists of the caller, in the order of BR-10. */
public record ListMyListsQuery(Caller caller) {

    public ListMyListsQuery {
        Objects.requireNonNull(caller, "caller");
    }
}
