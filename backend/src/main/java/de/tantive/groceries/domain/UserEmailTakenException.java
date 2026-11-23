package de.tantive.groceries.domain;

/** Another account already uses this e-mail address; the account is never linked by e-mail alone (SPRING-SEC-44). */
public final class UserEmailTakenException extends ConflictException {

    public UserEmailTakenException() {
        super("ACCOUNT_CONFLICT", "Mit dieser E-Mail-Adresse gibt es bereits ein anderes Konto.");
    }
}
