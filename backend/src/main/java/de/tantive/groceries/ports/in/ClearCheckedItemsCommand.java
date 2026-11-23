package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.DomainValidationException;
import de.tantive.groceries.domain.Item;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Input of ClearCheckedItems: the ids that were checked when the dialog opened (FR-ITEM-05 AC4). */
public record ClearCheckedItemsCommand(Caller caller, UUID listId, Set<UUID> itemIds) {

    public ClearCheckedItemsCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(listId, "listId");
        itemIds = Set.copyOf(itemIds);
        if (itemIds.size() > Item.MAX_ITEMS_PER_LIST) {
            throw new DomainValidationException("TOO_MANY_ITEMS", "itemIds", "Zu viele Artikel auf einmal.");
        }
    }

    public static ClearCheckedItemsCommand of(Caller caller, UUID listId, List<UUID> itemIds) {
        return new ClearCheckedItemsCommand(caller, listId, Set.copyOf(itemIds));
    }
}
