package de.tantive.groceries.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Links a user to a list and grants full rights on it (04 §2.1, BR-02). */
public record Membership(UUID userId, UUID listId, Instant joinedAt) {

    public Membership {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(listId, "listId");
        Objects.requireNonNull(joinedAt, "joinedAt");
    }
}
