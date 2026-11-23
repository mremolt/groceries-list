package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.RenameListCommand;
import de.tantive.groceries.ports.in.RenameListUseCase;
import de.tantive.groceries.ports.out.ListSummaryPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class RenameListService implements RenameListUseCase {

    private final LoadListPort load;
    private final SaveListPort save;
    private final ListSummaryPort summaries;
    private final Clock clock;

    RenameListService(LoadListPort load, SaveListPort save, ListSummaryPort summaries, Clock clock) {
        this.load = load;
        this.save = save;
        this.summaries = summaries;
        this.clock = clock;
    }

    @Override
    @Transactional
    public ListSummary renameList(RenameListCommand command) {
        UUID userId = command.caller().userId();
        ShoppingList list = load.findForMember(command.listId(), userId).orElseThrow(ListNotFoundException::new);
        ShoppingList renamed = list.renamed(command.name(), clock.instant());
        save.rename(renamed.id(), renamed.name(), renamed.updatedAt());
        return summaries.findSummaryOf(userId, renamed.id()).orElseThrow(ListNotFoundException::new);
    }
}
