package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.ListItemsQuery;
import de.tantive.groceries.ports.in.ListItemsUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.util.List;
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
    public List<Item> listItems(ListItemsQuery query) {
        if (lists.findForMember(query.listId(), query.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        return items.findAllOf(query.listId());
    }
}
