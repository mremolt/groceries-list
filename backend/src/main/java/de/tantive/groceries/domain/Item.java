package de.tantive.groceries.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * An item on a list (04 §2.1): free text and a done state. Order is by creation time only (BR-09). The version moves with
 * every change and is owned by the store; updates are idempotent sets without a precondition (ADR 0007).
 */
public record Item(UUID id, ItemText text, boolean done, Instant createdAt, long version) {

    /** BR-12: at most 500 items per list. */
    public static final int MAX_ITEMS_PER_LIST = 500;

    public Item {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(text, "text");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public static Item create(UUID id, ItemText text, Instant now) {
        return new Item(id, text, false, now, 0);
    }

    /** BR-12, checked by the use case after it locked the list row before counting (ARCH-UC-16, SPRING-DB-22). */
    public static void requireRoomForAnother(int existingItems) {
        if (existingItems >= MAX_ITEMS_PER_LIST) {
            throw new ItemLimitReachedException();
        }
    }
}
