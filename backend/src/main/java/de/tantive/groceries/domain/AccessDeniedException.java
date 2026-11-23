package de.tantive.groceries.domain;

/** The caller knows the object but lacks permission for this action (403). Error category of ARCH-UC-13; concrete errors extend exactly one base type (JAVA-ARCH-13). */
public abstract class AccessDeniedException extends RuntimeException {

    private final String code;

    protected AccessDeniedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
