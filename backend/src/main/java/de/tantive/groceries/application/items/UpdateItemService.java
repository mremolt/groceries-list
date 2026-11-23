package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ItemNotFoundException;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.UpdateItemCommand;
import de.tantive.groceries.ports.in.UpdateItemUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class UpdateItemService implements UpdateItemUseCase {

    private final LoadListPort lists;
    private final ItemPort items;
    private final Clock clock;

    UpdateItemService(LoadListPort lists, ItemPort items, Clock clock) {
        this.lists = lists;
        this.items = items;
        this.clock = clock;
    }

    @Override
    @Transactional
    public Item updateItem(UpdateItemCommand command) {
        if (lists.findForMember(command.listId(), command.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        return items.update(command.listId(), command.itemId(), command.text(), command.done(), clock.instant())
                .orElseThrow(ItemNotFoundException::new);
    }
}
