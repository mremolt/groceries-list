package de.tantive.groceries.config;

import java.util.Objects;

/** A secret configuration value that never prints itself (CFG-07, SPRING-CFG-11). */
public final class Secret {

    private final String value;

    public Secret(String value) {
        Objects.requireNonNull(value, "secret must not be null");
        if (value.isBlank()) {
            throw new IllegalArgumentException("secret must not be blank");
        }
        this.value = value;
    }

    /** Only where the value is handed to a client library. */
    public String reveal() {
        return value;
    }

    @Override
    public String toString() {
        return "***";
    }
}
