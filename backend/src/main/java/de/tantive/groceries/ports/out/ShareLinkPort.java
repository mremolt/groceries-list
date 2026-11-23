package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ShareToken;
import java.util.Optional;
import java.util.UUID;

/** Reads and writes the share token of a list (BR-06). The token is stored as it is shown: the link must be reproducible. */
public interface ShareLinkPort {

    /** The token of a list, empty until the first share link was asked for. */
    Optional<ShareToken> tokenOf(UUID listId);

    /** Sets the token only when the list has none: concurrent first requests end with one winner. */
    void assignIfAbsent(UUID listId, ShareToken token);

    /** Replaces the token; the previous one finds nothing from this transaction's commit on (BR-06). */
    void replace(UUID listId, ShareToken token);

    Optional<InvitedList> findByToken(ShareToken token);

    /** Like {@link #findByToken} and locks the list row until the transaction ends (SPRING-DB-22). */
    Optional<InvitedList> findByTokenLocked(ShareToken token);
}
