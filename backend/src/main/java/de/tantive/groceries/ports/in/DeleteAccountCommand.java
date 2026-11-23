package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import java.time.Instant;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * Input of DeleteAccount: the caller deletes their own account. {@code reauthenticatedAt} is when the session last
 * proved a fresh login at the identity provider ({@code null}: never), which the use case checks for recency.
 */
public record DeleteAccountCommand(Caller caller, @Nullable Instant reauthenticatedAt) {

    public DeleteAccountCommand {
        Objects.requireNonNull(caller, "caller");
    }
}
