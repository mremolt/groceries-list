package de.tantive.groceries.domain;

/** A business rule forbids the operation (422). Error category of ARCH-UC-13; concrete errors extend exactly one base type (JAVA-ARCH-13). */
public abstract class BusinessRuleException extends RuntimeException {

    private final String code;

    protected BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
