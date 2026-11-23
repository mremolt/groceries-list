package de.tantive.groceries.ports.out;

import java.time.Instant;
import java.util.List;

/** The identity-provider accounts whose deletion still has to happen (an outbox, DP-DEL deletion concept). */
public interface PendingIdpDeletionPort {

    void add(String subject, Instant now);

    void remove(String subject);

    /** At most {@code limit} subjects, oldest first. */
    List<String> oldest(int limit);
}
