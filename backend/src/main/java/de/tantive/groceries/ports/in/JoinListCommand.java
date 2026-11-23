package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ShareToken;
import java.util.Objects;

/** Input of JoinList: the token is the only way to a list the caller is no member of yet. */
public record JoinListCommand(Caller caller, ShareToken token) {

    public JoinListCommand {
        Objects.requireNonNull(caller, "caller");
        Objects.requireNonNull(token, "token");
    }
}
