package de.tantive.groceries.domain;

/** The object does not exist or the caller may not know it (404, SPRING-SEC-36). Error category of ARCH-UC-13; concrete errors extend exactly one base type (JAVA-ARCH-13). */
public abstract class NotFoundException extends RuntimeException {

    private final String code;

    protected NotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
