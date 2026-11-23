package de.tantive.groceries.ports.out;

import java.util.UUID;

/** Deletes a list with everything that belongs to it: memberships and, later, items (BR-05). */
public interface DeleteListPort {

    void delete(UUID listId);
}
