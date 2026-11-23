package de.tantive.groceries.domain;

import java.util.Objects;
import java.util.UUID;

/** What a member sees of a list in the navigation: name, number of open items, revision (read model, ADR 0006). */
public record ListSummary(UUID id, String name, int openCount, long revision) {

    public ListSummary {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
    }
}
