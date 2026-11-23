package de.tantive.groceries.application.sharing;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.ports.in.LookupInvitationQuery;
import de.tantive.groceries.ports.in.LookupInvitationUseCase;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
@Transactional(readOnly = true)
class LookupInvitationService implements LookupInvitationUseCase {

    private final ShareLinkPort links;

    LookupInvitationService(ShareLinkPort links) {
        this.links = links;
    }

    @Override
    public ListName lookupInvitation(LookupInvitationQuery query) {
        return links.findByToken(query.token()).map(InvitedList::name).orElseThrow(ShareLinkInvalidException::new);
    }
}
