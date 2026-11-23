package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ShareToken;

/** FR-SHARE-02, BR-06: replaces the token; the old one is invalid at once, memberships stay. */
public interface RenewShareLinkUseCase {

    ShareToken renewShareLink(RenewShareLinkCommand command);
}
