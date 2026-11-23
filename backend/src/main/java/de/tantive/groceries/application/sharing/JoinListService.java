package de.tantive.groceries.application.sharing;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.JoinListCommand;
import de.tantive.groceries.ports.in.JoinListResult;
import de.tantive.groceries.ports.in.JoinListUseCase;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class JoinListService implements JoinListUseCase {

    private final ShareLinkPort links;
    private final MembershipPort memberships;
    private final Clock clock;

    JoinListService(ShareLinkPort links, MembershipPort memberships, Clock clock) {
        this.links = links;
        this.memberships = memberships;
        this.clock = clock;
    }

    @Override
    @Transactional
    public JoinListResult joinList(JoinListCommand command) {
        UUID userId = command.caller().userId();
        // The list row is locked before the members are counted (SPRING-DB-22), then the user's row before their lists
        // are counted: always in this order, so the two locks cannot deadlock. A renewal in between finds the old
        // token gone (BR-06).
        InvitedList list = links.findByTokenLocked(command.token()).orElseThrow(ShareLinkInvalidException::new);
        if (memberships.isMember(list.id(), userId)) {
            return new JoinListResult(list.id(), list.name(), true); // FR-SHARE-03 AC2: no duplicate, no limits
        }
        ShoppingList.requireRoomForAnotherMember(memberships.countMembers(list.id()));
        ShoppingList.requireRoomForAnother(memberships.lockAndCountListsOf(userId));
        memberships.add(new Membership(userId, list.id(), clock.instant()));
        return new JoinListResult(list.id(), list.name(), false);
    }
}
