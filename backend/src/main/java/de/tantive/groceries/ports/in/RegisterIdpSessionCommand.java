package de.tantive.groceries.ports.in;

import java.util.Objects;

/** A login created the application session {@code sessionId} for the IdP session {@code sid} of {@code subject}. */
public record RegisterIdpSessionCommand(String sessionId, String sid, String subject) {

    public RegisterIdpSessionCommand {
        Objects.requireNonNull(sessionId, "sessionId");
        Objects.requireNonNull(sid, "sid");
        Objects.requireNonNull(subject, "subject");
    }
}
