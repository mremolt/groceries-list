package de.tantive.groceries.ports.in;

import java.util.Objects;

/**
 * Back-channel logout: end the sessions of one IdP session ({@code sid}), or all sessions of the {@code subject} when the
 * logout token carries no sid (the empty string stands for "no sid"; ARCH-UC-08 forbids null).
 */
public record EndIdpSessionsCommand(String subject, String sid) {

    public EndIdpSessionsCommand {
        Objects.requireNonNull(subject, "subject");
        Objects.requireNonNull(sid, "sid");
    }
}
