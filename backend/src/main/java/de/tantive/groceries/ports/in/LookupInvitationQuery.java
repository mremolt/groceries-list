package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ShareToken;
import java.util.Objects;

/** Query of a visitor without an account: the token alone authorises it (BR-08, FR-AUTH-06). */
public record LookupInvitationQuery(ShareToken token) {

    public LookupInvitationQuery {
        Objects.requireNonNull(token, "token");
    }
}
