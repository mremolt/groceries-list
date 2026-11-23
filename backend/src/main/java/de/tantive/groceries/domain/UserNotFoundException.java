package de.tantive.groceries.domain;

/** The account does not exist (any more). */
public final class UserNotFoundException extends NotFoundException {

    public UserNotFoundException() {
        super("USER_NOT_FOUND", "Das Konto gibt es nicht.");
    }
}
