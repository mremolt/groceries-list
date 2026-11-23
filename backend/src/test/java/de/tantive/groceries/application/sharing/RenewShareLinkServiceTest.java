package de.tantive.groceries.application.sharing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.RenewShareLinkCommand;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@Tag("cross-user")
class RenewShareLinkServiceTest {

    private final LoadListPort load = mock(LoadListPort.class);
    private final ShareLinkPort links = mock(ShareLinkPort.class);
    private final RenewShareLinkService service = new RenewShareLinkService(load, links);
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, Instant.EPOCH);

    @Test
    void aMemberReplacesTheTokenUnderTheListLock() {
        when(load.findForMemberLocked(listId, People.ALICE_ID)).thenReturn(Optional.of(list));

        ShareToken result = service.renewShareLink(new RenewShareLinkCommand(People.alice(), listId));

        ArgumentCaptor<ShareToken> stored = forClass(ShareToken.class);
        var order = inOrder(load, links);
        order.verify(load).findForMemberLocked(listId, People.ALICE_ID);
        order.verify(links).replace(any(), stored.capture());
        assertThat(result).isEqualTo(stored.getValue());
    }

    @Test
    void aNonMemberGetsNotFoundAndTheTokenStays() {
        when(load.findForMemberLocked(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.renewShareLink(new RenewShareLinkCommand(People.bob(), listId)))
                .isInstanceOf(ListNotFoundException.class);

        verify(links, never()).replace(any(), any());
    }
}
