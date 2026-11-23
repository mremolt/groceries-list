package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.DeleteListCommand;
import de.tantive.groceries.ports.in.DeleteListUseCase;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class DeleteListService implements DeleteListUseCase {

    private final LoadListPort load;
    private final DeleteListPort delete;

    DeleteListService(LoadListPort load, DeleteListPort delete) {
        this.load = load;
        this.delete = delete;
    }

    @Override
    @Transactional
    public void deleteList(DeleteListCommand command) {
        if (load.findForMember(command.listId(), command.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        delete.delete(command.listId());
    }
}
