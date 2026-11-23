package de.tantive.groceries.domain;

/** The share link is unknown, renewed or malformed: one answer for all, revealing nothing about any list (FR-SHARE-04). */
public final class ShareLinkInvalidException extends NotFoundException {

    public ShareLinkInvalidException() {
        super("SHARE_LINK_INVALID", "Bitte die Person, die dir den Link geschickt hat, um einen neuen.");
    }
}
