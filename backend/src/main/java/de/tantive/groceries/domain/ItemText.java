package de.tantive.groceries.domain;

import org.jspecify.annotations.Nullable;

/** The text of an item: one free-text line of 1-200 characters after trimming (FR-ITEM-01 AC2, AC4). */
public record ItemText(String value) {

    public static final int MAX_LENGTH = 200;

    public ItemText {
        String trimmed = value.strip();
        if (trimmed.isEmpty()) {
            throw new DomainValidationException("TEXT_REQUIRED", "text", "Bitte gib einen Artikel ein.");
        }
        if (trimmed.codePointCount(0, trimmed.length()) > MAX_LENGTH) {
            throw new DomainValidationException("TEXT_TOO_LONG", "text", "Höchstens 200 Zeichen.");
        }
        value = trimmed;
    }

    /** Validates a text from outside; a missing text is the same error as an empty one. */
    public static ItemText of(@Nullable String raw) {
        return new ItemText(raw == null ? "" : raw);
    }
}
