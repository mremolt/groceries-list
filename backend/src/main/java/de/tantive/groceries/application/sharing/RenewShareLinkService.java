package de.tantive.groceries.application.sharing;

import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.RenewShareLinkCommand;
import de.tantive.groceries.ports.in.RenewShareLinkUseCase;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.stereotype.UseCase;
import org.springframework.transaction.annotation.Transactional;

@UseCase
class RenewShareLinkService implements RenewShareLinkUseCase {

    private final LoadListPort load;
    private final ShareLinkPort links;

    RenewShareLinkService(LoadListPort load, ShareLinkPort links) {
        this.load = load;
        this.links = links;
    }

    @Override
    @Transactional
    public ShareToken renewShareLink(RenewShareLinkCommand command) {
        // the list row is locked: a join that read the old token waits and then finds nothing (BR-06, SPRING-DB-22)
        if (load.findForMemberLocked(command.listId(), command.caller().userId())
                .isEmpty()) {
            throw new ListNotFoundException();
        }
        ShareToken token = ShareToken.generate();
        links.replace(command.listId(), token);
        return token;
    }
}
