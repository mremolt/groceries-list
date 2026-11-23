package de.tantive.groceries.domain;

/** The list does not exist or the caller is no member: one answer for both (SPRING-SEC-36, NFR-SEC-04). */
public final class ListNotFoundException extends NotFoundException {

    public ListNotFoundException() {
        super("LIST_NOT_FOUND", "Diese Liste gibt es nicht oder du hast keinen Zugriff.");
    }
}
