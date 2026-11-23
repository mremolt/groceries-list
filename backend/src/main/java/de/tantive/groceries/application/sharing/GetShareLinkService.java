package de.tantive.groceries.application.sharing;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.GetShareLinkQuery;
import de.tantive.groceries.ports.in.GetShareLinkUseCase;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class GetShareLinkService implements GetShareLinkUseCase {

    private final LoadListPort load;
    private final ShareLinkPort links;

    GetShareLinkService(LoadListPort load, ShareLinkPort links) {
        this.load = load;
        this.links = links;
    }

    @Override
    @Transactional
    public ShareToken getShareLink(GetShareLinkQuery query) {
        // BR-01: only members see the link; non-members and unknown ids look the same
        if (load.findForMember(query.listId(), query.caller().userId()).isEmpty()) {
            throw new ListNotFoundException();
        }
        return links.tokenOf(query.listId()).orElseGet(() -> {
            // a set-if-absent: two members asking at once end with the same token (BR-06)
            links.assignIfAbsent(query.listId(), ShareToken.generate());
            return links.tokenOf(query.listId()).orElseThrow(IllegalStateException::new);
        });
    }
}
