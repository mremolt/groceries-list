package de.tantive.groceries.ports.in;

import java.util.UUID;

/** The product's view of the logged-in person. */
public record ProvideUserResult(UUID userId, String email, String displayName) {}
