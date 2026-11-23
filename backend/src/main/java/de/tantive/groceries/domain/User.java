package de.tantive.groceries.domain;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * A registered person (04 §2.1). Credentials live at the identity provider; the product keeps the link to the IdP
 * subject, the e-mail address (trimmed, lower-cased, unique) and the display name (1-50 characters).
 */
public record User(UUID id, String subject, String email, String displayName, Instant createdAt, Instant lastLoginAt) {

    private static final int MAX_NAME = 50;

    public User {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(lastLoginAt, "lastLoginAt");
        if (subject.isBlank()) {
            throw new DomainValidationException("SUBJECT_REQUIRED", "subject", "Der IdP-Subject fehlt.");
        }
        email = normalizeEmail(email);
        displayName = displayName(displayName, email);
    }

    /** First login: the account is created from the identity provider's claims. */
    public static User register(UUID id, String subject, String email, String displayName, Instant now) {
        return new User(id, subject, email, displayName, now, now);
    }

    /** A later login: records the time and takes over the name the identity provider currently reports. */
    public User loggedIn(String currentDisplayName, Instant now) {
        return new User(id, subject, email, currentDisplayName, createdAt, now);
    }

    private static String normalizeEmail(String raw) {
        String normalized = raw.strip().toLowerCase(Locale.ROOT);
        int at = normalized.indexOf('@');
        if (at < 1 || at == normalized.length() - 1 || normalized.length() > 254 || normalized.contains(" ")) {
            throw new DomainValidationException("EMAIL_INVALID", "email", "Die E-Mail-Adresse ist ungültig.");
        }
        return normalized;
    }

    private static String displayName(String raw, String normalizedEmail) {
        String name = raw.strip();
        if (name.isEmpty()) {
            name = normalizedEmail.substring(0, normalizedEmail.indexOf('@'));
        }
        return name.length() > MAX_NAME ? name.substring(0, MAX_NAME).strip() : name;
    }
}
