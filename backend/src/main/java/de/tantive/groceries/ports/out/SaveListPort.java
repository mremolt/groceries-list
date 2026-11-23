package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShoppingList;
import java.time.Instant;
import java.util.UUID;

/** Writes lists. A rename is a set, atomic in the store, and moves the revision (ADR 0006, ADR 0007). */
public interface SaveListPort {

    ShoppingList create(ShoppingList list);

    void rename(UUID listId, ListName name, Instant now);
}
