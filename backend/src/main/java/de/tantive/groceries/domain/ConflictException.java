package de.tantive.groceries.domain;

/** The current state conflicts with the request (409). Error category of ARCH-UC-13; concrete errors extend exactly one base type (JAVA-ARCH-13). */
public abstract class ConflictException extends RuntimeException {

    private final String code;

    protected ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
