package de.tantive.groceries.domain;

import org.jspecify.annotations.Nullable;

/** Invalid input (validation category of ARCH-UC-13, JAVA-ARCH-12). Carries a stable code and, where known, the field. */
public class DomainValidationException extends RuntimeException {

    private final String code;
    private final @Nullable String field;

    public DomainValidationException(String code, @Nullable String field, String message) {
        super(message);
        this.code = code;
        this.field = field;
    }

    public String code() {
        return code;
    }

    public @Nullable String field() {
        return field;
    }
}
