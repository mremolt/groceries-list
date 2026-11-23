package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ShareToken;

/** FR-SHARE-01: the current token of a list; created on first use (BR-06: exactly one valid token at a time). */
public interface GetShareLinkUseCase {

    ShareToken getShareLink(GetShareLinkQuery query);
}
