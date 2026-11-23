package de.tantive.groceries.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * The authenticated person on whose behalf a use case runs (SPRING-SEC-39). Built in one place by the REST adapter from
 * the session; never null. There are no roles: all members of a list are equal (BR-02).
 */
public record Caller(UUID userId, String subject, String email, String displayName) {

    public Caller {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(subject, "subject");
        Objects.requireNonNull(email, "email");
        Objects.requireNonNull(displayName, "displayName");
    }
}
