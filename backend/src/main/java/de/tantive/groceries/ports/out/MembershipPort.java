package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.Membership;
import java.util.UUID;

/** Reads and changes who belongs to which list. */
public interface MembershipPort {

    /** Locks the user's memberships against concurrent creation, then counts their lists (ARCH-UC-16, SPRING-DB-22). */
    int lockAndCountListsOf(UUID userId);

    void add(Membership membership);

    void remove(UUID listId, UUID userId);

    int countMembers(UUID listId);

    boolean isMember(UUID listId, UUID userId);
}
