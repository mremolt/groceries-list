package de.tantive.groceries.ports.in;

import java.util.Objects;

/** Claims of a successful login, as the identity provider reports them (ARCH-UC-04/05). */
public record ProvideUserCommand(String subject, String email, String displayName) {

    public ProvideUserCommand {
        Objects.requireNonNull(subject, "subject");
        Objects.requireNonNull(email, "email");
        Objects.requireNonNull(displayName, "displayName");
    }
}
