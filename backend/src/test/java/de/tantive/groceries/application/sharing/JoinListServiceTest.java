package de.tantive.groceries.application.sharing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ListLimitReachedException;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.MemberLimitReachedException;
import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.JoinListCommand;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.support.People;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Bob is not a member: the token is his only way in, and an old one gets him nowhere (SPRING-SEC-16). */
@Tag("cross-user")
class JoinListServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    private final ShareLinkPort links = mock(ShareLinkPort.class);
    private final MembershipPort memberships = mock(MembershipPort.class);
    private final JoinListService service = new JoinListService(links, memberships, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID listId = UUID.randomUUID();
    private final ShareToken token = ShareToken.generate();
    private final InvitedList list = new InvitedList(listId, ListName.of("WG"));

    @Test
    void aNewMemberJoinsUnderTheListLockAndThenTheUserLock() {
        when(links.findByTokenLocked(token)).thenReturn(Optional.of(list));
        when(memberships.countMembers(listId)).thenReturn(2);
        when(memberships.lockAndCountListsOf(People.BOB_ID)).thenReturn(3);

        var result = service.joinList(new JoinListCommand(People.bob(), token));

        assertThat(result.alreadyMember()).isFalse();
        assertThat(result.listId()).isEqualTo(listId);
        assertThat(result.listName().value()).isEqualTo("WG");
        var order = inOrder(links, memberships);
        order.verify(links).findByTokenLocked(token);
        order.verify(memberships).countMembers(listId);
        order.verify(memberships).lockAndCountListsOf(People.BOB_ID);
        order.verify(memberships).add(new Membership(People.BOB_ID, listId, NOW));
    }

    @Test
    void aMemberOpeningTheLinkAgainChangesNothing() {
        when(links.findByTokenLocked(token)).thenReturn(Optional.of(list));
        when(memberships.isMember(listId, People.BOB_ID)).thenReturn(true);

        var result = service.joinList(new JoinListCommand(People.bob(), token));

        assertThat(result.alreadyMember()).isTrue();
        verify(memberships, never()).add(any());
    }

    @Test
    void anUnknownOrRenewedTokenIsInvalidAndNobodyJoins() {
        when(links.findByTokenLocked(token)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.joinList(new JoinListCommand(People.bob(), token)))
                .isInstanceOf(ShareLinkInvalidException.class);

        verify(memberships, never()).add(any());
    }

    @Test
    void theFiftyFirstMemberIsRefused() {
        when(links.findByTokenLocked(token)).thenReturn(Optional.of(list));
        when(memberships.countMembers(listId)).thenReturn(50);

        assertThatThrownBy(() -> service.joinList(new JoinListCommand(People.bob(), token)))
                .isInstanceOf(MemberLimitReachedException.class);

        verify(memberships, never()).add(any());
    }

    @Test
    void aPersonWithAHundredListsCannotJoinAnother() {
        when(links.findByTokenLocked(token)).thenReturn(Optional.of(list));
        when(memberships.countMembers(listId)).thenReturn(1);
        when(memberships.lockAndCountListsOf(People.BOB_ID)).thenReturn(100);

        assertThatThrownBy(() -> service.joinList(new JoinListCommand(People.bob(), token)))
                .isInstanceOf(ListLimitReachedException.class);

        verify(memberships, never()).add(any());
    }
}
