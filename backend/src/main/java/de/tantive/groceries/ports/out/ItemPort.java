package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ItemText;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Items of a list. Every write moves the list's revision in the same transaction (ADR 0006); updates are sets without a
 * version precondition (ADR 0007). The caller has checked membership of the list before.
 */
public interface ItemPort {

    /** Oldest first, at most 500 (BR-09, BR-12), in one read. */
    List<Item> findAllOf(UUID listId);

    int countOf(UUID listId);

    Item add(UUID listId, Item item, Instant now);

    /** Applies the given parts; empty when the item does not exist in this list. */
    Optional<Item> update(UUID listId, UUID itemId, @Nullable ItemText text, @Nullable Boolean done, Instant now);

    /** Returns whether the item existed. */
    boolean delete(UUID listId, UUID itemId, Instant now);

    /** Deletes those of the ids that are checked right now and belong to the list; returns how many. */
    int deleteChecked(UUID listId, Set<UUID> itemIds, Instant now);
}
