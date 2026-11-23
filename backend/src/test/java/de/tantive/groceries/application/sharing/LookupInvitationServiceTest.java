package de.tantive.groceries.application.sharing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.LookupInvitationQuery;
import de.tantive.groceries.ports.out.ShareLinkPort;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LookupInvitationServiceTest {

    private final ShareLinkPort links = mock(ShareLinkPort.class);
    private final LookupInvitationService service = new LookupInvitationService(links);

    @Test
    void aValidTokenGivesTheListNameAndNothingElse() {
        ShareToken token = ShareToken.generate();
        when(links.findByToken(token)).thenReturn(Optional.of(new InvitedList(UUID.randomUUID(), ListName.of("WG"))));

        assertThat(service.lookupInvitation(new LookupInvitationQuery(token)).value())
                .isEqualTo("WG");
    }

    @Test
    void anUnknownOrRenewedTokenIsInvalid() {
        ShareToken token = ShareToken.generate();
        when(links.findByToken(token)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.lookupInvitation(new LookupInvitationQuery(token)))
                .isInstanceOf(ShareLinkInvalidException.class);
    }
}
