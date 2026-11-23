package de.tantive.groceries.domain;

import java.util.Objects;
import java.util.UUID;

/** The list behind a share link, as far as a visitor may know it: its id (for members only) and its name (FR-AUTH-06 AC4). */
public record InvitedList(UUID id, ListName name) {

    public InvitedList {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
    }
}
