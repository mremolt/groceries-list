package de.tantive.groceries.application.lists;

import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.CreateListCommand;
import de.tantive.groceries.ports.in.CreateListUseCase;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class CreateListService implements CreateListUseCase {

    private final MembershipPort memberships;
    private final SaveListPort saveList;
    private final Clock clock;

    CreateListService(MembershipPort memberships, SaveListPort saveList, Clock clock) {
        this.memberships = memberships;
        this.saveList = saveList;
        this.clock = clock;
    }

    @Override
    @Transactional
    public ListSummary createList(CreateListCommand command) {
        UUID userId = command.caller().userId();
        // the count happens under the user's lock, so two parallel creations cannot both pass the limit (BR-12)
        ShoppingList.requireRoomForAnother(memberships.lockAndCountListsOf(userId));
        Instant now = clock.instant();
        ShoppingList list = saveList.create(ShoppingList.create(UUID.randomUUID(), command.name(), userId, now));
        memberships.add(new Membership(userId, list.id(), now));
        return new ListSummary(list.id(), list.name().value(), 0, list.revision());
    }
}
