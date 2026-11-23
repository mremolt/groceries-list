package de.tantive.groceries.ports.in;

import java.util.UUID;

/** Profile of the caller. */
public record CurrentUser(UUID id, String displayName, String email) {}
