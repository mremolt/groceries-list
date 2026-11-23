package de.tantive.groceries.domain;

import org.jspecify.annotations.Nullable;

/** The name of a list: 1-80 characters after trimming (04 §2.1). Duplicates are allowed. */
public record ListName(String value) {

    public static final int MAX_LENGTH = 80;

    public ListName {
        String trimmed = value.strip();
        if (trimmed.isEmpty()) {
            throw new DomainValidationException("NAME_REQUIRED", "name", "Bitte gib einen Namen ein.");
        }
        if (trimmed.codePointCount(0, trimmed.length()) > MAX_LENGTH) {
            throw new DomainValidationException(
                    "NAME_TOO_LONG", "name", "Der Name darf höchstens 80 Zeichen lang sein.");
        }
        value = trimmed;
    }

    /** Validates a name from outside; a missing name is the same error as an empty one. */
    public static ListName of(@Nullable String raw) {
        return new ListName(raw == null ? "" : raw);
    }
}
