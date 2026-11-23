package de.tantive.groceries.application.accounts;

import de.tantive.groceries.ports.in.RetryIdpDeletionsUseCase;
import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import de.tantive.groceries.stereotype.UseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Finishes account deletions at the identity provider that failed once (an outbox). Deleting is idempotent, so two
 * instances running this at the same time do no harm and need no lock (RES-JOB idempotence).
 */
@UseCase
class RetryIdpDeletionsService implements RetryIdpDeletionsUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(RetryIdpDeletionsService.class);
    private static final int BATCH = 50;

    private final PendingIdpDeletionPort pending;
    private final IdentityProviderPort identityProvider;

    RetryIdpDeletionsService(PendingIdpDeletionPort pending, IdentityProviderPort identityProvider) {
        this.pending = pending;
        this.identityProvider = identityProvider;
    }

    @Override
    public int retryPendingDeletions() {
        int done = 0;
        for (String subject : pending.oldest(BATCH)) {
            try {
                identityProvider.deleteUser(subject);
            } catch (IdentityProviderUnavailableException e) {
                LOG.warn("The identity provider is still unavailable, {} deletion(s) stay pending", done, e);
                return done;
            }
            pending.remove(subject);
            done++;
        }
        return done;
    }
}
