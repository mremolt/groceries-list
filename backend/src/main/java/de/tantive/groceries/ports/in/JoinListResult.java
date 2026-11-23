package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListName;
import java.util.Objects;
import java.util.UUID;

/** Output of JoinList; {@code alreadyMember} is true when nothing changed (FR-SHARE-03 AC2). */
public record JoinListResult(UUID listId, ListName listName, boolean alreadyMember) {

    public JoinListResult {
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(listName, "listName");
    }
}
