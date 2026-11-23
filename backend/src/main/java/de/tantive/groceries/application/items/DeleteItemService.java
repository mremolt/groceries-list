package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.DeleteItemCommand;
import de.tantive.groceries.ports.in.DeleteItemUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class DeleteItemService implements DeleteItemUseCase {

    private final LoadListPort lists;
    private final ItemPort items;
    private final Clock clock;

    DeleteItemService(LoadListPort lists, ItemPort items, Clock clock) {
        this.lists = lists;
        this.items = items;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void deleteItem(DeleteItemCommand command) {
        if (lists.findForMember(command.listId(), command.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        items.delete(command.listId(), command.itemId(), clock.instant());
    }
}
