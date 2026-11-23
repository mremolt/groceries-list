package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.ListSummary;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Read model for the navigation: one set-based read for all lists of a user, never one call per list (API-N1-05). */
public interface ListSummaryPort {

    /** At most 100 lists (BR-12), by the user's join time ascending (BR-10). */
    List<ListSummary> findSummariesOf(UUID userId);

    /** Empty when the list does not exist or the user is no member. */
    Optional<ListSummary> findSummaryOf(UUID userId, UUID listId);
}
