package de.tantive.groceries.application.sharing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.in.GetShareLinkQuery;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("cross-user")
class GetShareLinkServiceTest {

    private final LoadListPort load = mock(LoadListPort.class);
    private final ShareLinkPort links = mock(ShareLinkPort.class);
    private final GetShareLinkService service = new GetShareLinkService(load, links);
    private final UUID listId = UUID.randomUUID();
    private final ShoppingList list = ShoppingList.create(listId, ListName.of("WG"), People.ALICE_ID, Instant.EPOCH);

    @Test
    void aMemberGetsTheExistingToken() {
        ShareToken token = ShareToken.generate();
        when(load.findForMember(listId, People.ALICE_ID)).thenReturn(Optional.of(list));
        when(links.tokenOf(listId)).thenReturn(Optional.of(token));

        assertThat(service.getShareLink(new GetShareLinkQuery(People.alice(), listId)))
                .isEqualTo(token);

        verify(links, never()).assignIfAbsent(any(), any());
    }

    @Test
    void theFirstRequestCreatesTheToken() {
        ShareToken stored = ShareToken.generate();
        when(load.findForMember(listId, People.ALICE_ID)).thenReturn(Optional.of(list));
        when(links.tokenOf(listId)).thenReturn(Optional.empty(), Optional.of(stored));

        ShareToken result = service.getShareLink(new GetShareLinkQuery(People.alice(), listId));

        verify(links).assignIfAbsent(any(), any());
        assertThat(result).isEqualTo(stored); // the stored winner is returned, not the locally generated candidate
    }

    @Test
    void aNonMemberGetsNotFoundAndNoTokenIsCreated() {
        when(load.findForMember(listId, People.BOB_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getShareLink(new GetShareLinkQuery(People.bob(), listId)))
                .isInstanceOf(ListNotFoundException.class);

        verify(links, never()).tokenOf(any());
        verify(links, never()).assignIfAbsent(any(), any());
    }
}
