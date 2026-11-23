package de.tantive.groceries.application.items;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.AddItemCommand;
import de.tantive.groceries.ports.in.AddItemUseCase;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class AddItemService implements AddItemUseCase {

    private final LoadListPort lists;
    private final ItemPort items;
    private final Clock clock;

    AddItemService(LoadListPort lists, ItemPort items, Clock clock) {
        this.lists = lists;
        this.items = items;
        this.clock = clock;
    }

    @Override
    @Transactional
    public Item addItem(AddItemCommand command) {
        // the list row is locked before the count, so two parallel additions cannot both pass the limit (BR-12)
        if (lists.findForMemberLocked(command.listId(), command.caller().userId())
                .isEmpty()) {
            throw new ListNotFoundException();
        }
        Item.requireRoomForAnother(items.countOf(command.listId()));
        Instant now = clock.instant();
        return items.add(command.listId(), Item.create(UUID.randomUUID(), command.text(), now), now);
    }
}
