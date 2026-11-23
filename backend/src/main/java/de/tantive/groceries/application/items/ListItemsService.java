package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.ItemsSnapshot;
import de.tantive.groceries.ports.in.ListItemsQuery;
import de.tantive.groceries.ports.in.ListItemsUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class ListItemsService implements ListItemsUseCase {

    private final LoadListPort lists;
    private final ItemPort items;

    ListItemsService(LoadListPort lists, ItemPort items) {
        this.lists = lists;
        this.items = items;
    }

    @Override
    @Transactional(readOnly = true)
    public ItemsSnapshot listItems(ListItemsQuery query) {
        // membership and revision come from one single-row read; the items are read after it, so the snapshot is at
        // least as new as the revision it is labelled with and a client never keeps stale data under a newer label
        ShoppingList list =
                lists.findForMember(query.listId(), query.caller().userId()).orElseThrow(ListNotFoundException::new);
        Long known = query.knownRevision();
        if (known != null && known == list.revision()) {
            return ItemsSnapshot.unchanged(list.revision());
        }
        return ItemsSnapshot.changed(list.revision(), items.findAllOf(query.listId()));
    }
}
