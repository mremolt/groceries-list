package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.DomainValidationException;
import de.tantive.groceries.domain.ItemText;
import java.util.Objects;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** Input of UpdateItem: sets the text and/or the done state; at least one (FR-ITEM-02/03, last write wins, ADR 0007). */
public record UpdateItemCommand(
        Caller caller,
        UUID listId,
        UUID itemId,
        @Nullable ItemText text,
        @Nullable Boolean done) {

    public UpdateItemCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(itemId, "itemId");
        if (text == null && done == null) {
            throw new DomainValidationException("CHANGE_REQUIRED", null, "Gib den Text oder den Status an.");
        }
    }
}
