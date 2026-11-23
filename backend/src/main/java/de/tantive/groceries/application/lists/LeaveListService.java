package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.LeaveListCommand;
import de.tantive.groceries.ports.in.LeaveListUseCase;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class LeaveListService implements LeaveListUseCase {

    private final LoadListPort load;
    private final MembershipPort memberships;
    private final DeleteListPort delete;

    LeaveListService(LoadListPort load, MembershipPort memberships, DeleteListPort delete) {
        this.load = load;
        this.memberships = memberships;
        this.delete = delete;
    }

    @Override
    @Transactional
    public void leaveList(LeaveListCommand command) {
        // the list row is locked before the members are counted, so the last two members leaving at once
        // serialize: exactly one of them deletes the list (BR-04, ARCH-UC-16, SPRING-DB-22)
        if (load.findForMemberLocked(command.listId(), command.caller().userId())
                .isEmpty()) {
            throw new ListNotFoundException();
        }
        memberships.remove(command.listId(), command.caller().userId());
        if (memberships.countMembers(command.listId()) == 0) {
            delete.delete(command.listId());
        }
    }
}
