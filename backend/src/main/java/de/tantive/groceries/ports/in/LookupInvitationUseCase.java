package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListName;

/** FR-AUTH-06 AC1/AC4: the name of the list behind a valid token and nothing else. */
public interface LookupInvitationUseCase {

    ListName lookupInvitation(LookupInvitationQuery query);
}
