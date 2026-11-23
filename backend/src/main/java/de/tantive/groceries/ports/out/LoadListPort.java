package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.ShoppingList;
import java.util.Optional;
import java.util.UUID;

/** Reads a list for one of its members: empty when it does not exist or the user is no member (BR-01). */
public interface LoadListPort {

    Optional<ShoppingList> findForMember(UUID listId, UUID userId);

    /** Like {@link #findForMember} and locks the list row until the transaction ends (SPRING-DB-22). */
    Optional<ShoppingList> findForMemberLocked(UUID listId, UUID userId);
}
