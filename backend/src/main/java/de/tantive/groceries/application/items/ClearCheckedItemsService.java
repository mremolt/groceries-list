package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.ClearCheckedItemsCommand;
import de.tantive.groceries.ports.in.ClearCheckedItemsUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class ClearCheckedItemsService implements ClearCheckedItemsUseCase {

    private final LoadListPort lists;
    private final ItemPort items;
    private final Clock clock;

    ClearCheckedItemsService(LoadListPort lists, ItemPort items, Clock clock) {
        this.lists = lists;
        this.items = items;
        this.clock = clock;
    }

    @Override
    @Transactional
    public int clearCheckedItems(ClearCheckedItemsCommand command) {
        if (lists.findForMember(command.listId(), command.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        if (command.itemIds().isEmpty()) {
            return 0;
        }
        return items.deleteChecked(command.listId(), command.itemIds(), clock.instant());
    }
}
