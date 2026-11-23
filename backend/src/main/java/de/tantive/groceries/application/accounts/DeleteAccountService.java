package de.tantive.groceries.application.accounts;

import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.ReauthenticationRequiredException;
import de.tantive.groceries.ports.in.DeleteAccountCommand;
import de.tantive.groceries.ports.in.DeleteAccountUseCase;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.DeleteUserPort;
import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.ports.out.IdpSessionPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import de.tantive.groceries.stereotype.UseCase;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionOperations;

/**
 * FR-SET-04, BR-04. One transaction erases the product's data: the user row is locked first (as every creation of a list
 * does), then each list of the person is locked, the membership removed and the list deleted when nobody is left
 * (ARCH-UC-16: two last members deleting their accounts at once cannot both leave a list behind). Items stay with the
 * lists that remain; they carry no reference to their author. The identity provider is called after the commit, with
 * the subject recorded in the same transaction as the work to retry: the account is gone for the product in any case.
 */
@UseCase
class DeleteAccountService implements DeleteAccountUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(DeleteAccountService.class);

    /** How fresh the login must be that confirms the deletion (ADR 0003: re-authentication instead of a password field). */
    static final Duration REAUTHENTICATION_MAX_AGE = Duration.ofMinutes(5);

    private final TransactionOperations transaction;
    private final LoadListPort loadLists;
    private final MembershipPort memberships;
    private final DeleteListPort deleteList;
    private final DeleteUserPort deleteUser;
    private final IdpSessionPort sessions;
    private final PendingIdpDeletionPort pending;
    private final IdentityProviderPort identityProvider;
    private final Clock clock;

    DeleteAccountService(
            TransactionOperations transaction,
            LoadListPort loadLists,
            MembershipPort memberships,
            DeleteListPort deleteList,
            DeleteUserPort deleteUser,
            IdpSessionPort sessions,
            PendingIdpDeletionPort pending,
            IdentityProviderPort identityProvider,
            Clock clock) {
        this.transaction = transaction;
        this.loadLists = loadLists;
        this.memberships = memberships;
        this.deleteList = deleteList;
        this.deleteUser = deleteUser;
        this.sessions = sessions;
        this.pending = pending;
        this.identityProvider = identityProvider;
        this.clock = clock;
    }

    @Override
    public void deleteAccount(DeleteAccountCommand command) {
        Instant now = clock.instant();
        requireFreshLogin(command.reauthenticatedAt(), now);
        Caller caller = command.caller();

        transaction.executeWithoutResult(status -> eraseProductData(caller, now));

        try {
            identityProvider.deleteUser(caller.subject());
            pending.remove(caller.subject());
        } catch (IdentityProviderUnavailableException e) {
            // the subject stays in the outbox; RetryIdpDeletions finishes it (no subject, name or address in the log)
            LOG.warn("Deleting the account at the identity provider is postponed", e);
        }
    }

    private void eraseProductData(Caller caller, Instant now) {
        UUID userId = caller.userId();
        memberships.lockAndCountListsOf(userId);
        for (UUID listId : memberships.listIdsOf(userId)) {
            if (loadLists.findForMemberLocked(listId, userId).isEmpty()) {
                continue; // left meanwhile
            }
            memberships.remove(listId, userId);
            if (memberships.countMembers(listId) == 0) {
                deleteList.delete(listId);
            }
        }
        deleteUser.delete(userId);
        sessions.endBySubject(caller.subject());
        pending.add(caller.subject(), now);
    }

    private static void requireFreshLogin(@Nullable Instant reauthenticatedAt, Instant now) {
        if (reauthenticatedAt == null
                || reauthenticatedAt.isAfter(now)
                || Duration.between(reauthenticatedAt, now).compareTo(REAUTHENTICATION_MAX_AGE) > 0) {
            throw new ReauthenticationRequiredException();
        }
    }
}
