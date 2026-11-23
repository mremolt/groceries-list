package de.tantive.groceries.ports.in;

/** FR-SET-01: a person changes their own display name. */
public interface UpdateDisplayNameUseCase {

    CurrentUser updateDisplayName(UpdateDisplayNameCommand command);
}
