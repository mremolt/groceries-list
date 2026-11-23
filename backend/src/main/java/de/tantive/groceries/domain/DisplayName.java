package de.tantive.groceries.domain;

import org.jspecify.annotations.Nullable;

/** The display name of a person: 1-50 characters after trimming (FR-SET-01, FR-AUTH-01 AC2). */
public record DisplayName(String value) {

    public static final int MAX_LENGTH = 50;

    public DisplayName {
        String trimmed = value.strip();
        if (trimmed.isEmpty()) {
            throw new DomainValidationException(
                    "DISPLAY_NAME_REQUIRED", "displayName", "Bitte gib einen Anzeigenamen ein.");
        }
        if (trimmed.codePointCount(0, trimmed.length()) > MAX_LENGTH) {
            throw new DomainValidationException(
                    "DISPLAY_NAME_TOO_LONG", "displayName", "Der Anzeigename darf höchstens 50 Zeichen lang sein.");
        }
        value = trimmed;
    }

    /** Validates a name from outside; a missing name is the same error as an empty one. */
    public static DisplayName of(@Nullable String raw) {
        return new DisplayName(raw == null ? "" : raw);
    }
}
