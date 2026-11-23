package de.tantive.groceries.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * A grocery list (04 §2.1). All members are equal (BR-02): the creator is recorded for information only and has no
 * extra rights, and is empty once that account is deleted. The revision is owned by the database: it moves with every
 * change to the list or its items (ADR 0006) and is only read here.
 */
public record ShoppingList(
        UUID id, ListName name, @Nullable UUID createdBy, Instant createdAt, Instant updatedAt, long revision) {

    /** BR-12: at most 100 lists per user. */
    public static final int MAX_LISTS_PER_USER = 100;

    public ShoppingList {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public static ShoppingList create(UUID id, ListName name, UUID createdBy, Instant now) {
        return new ShoppingList(id, name, createdBy, now, now, 0);
    }

    public ShoppingList renamed(ListName newName, Instant now) {
        return new ShoppingList(id, newName, createdBy, createdAt, now, revision);
    }

    /** BR-12, checked by the use case after it locked the user's memberships before counting (ARCH-UC-16). */
    public static void requireRoomForAnother(int existingLists) {
        if (existingLists >= MAX_LISTS_PER_USER) {
            throw new ListLimitReachedException();
        }
    }
}
