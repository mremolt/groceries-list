package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.Item;
import java.util.List;

/** The items of a list, oldest first (BR-09), at most 500 (BR-12); not found for non-members (BR-01). */
public interface ListItemsUseCase {

    List<Item> listItems(ListItemsQuery query);
}
