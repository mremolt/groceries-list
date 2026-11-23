package de.tantive.groceries.adapter.in.scheduling;

import de.tantive.groceries.ports.in.RetryIdpDeletionsUseCase;
import de.tantive.groceries.stereotype.SchedulingAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Triggers the retry of account deletions at the identity provider (FR-SET-04). The use case is idempotent, so running
 * on every instance needs no lock. The first run waits one full delay after the start.
 */
@SchedulingAdapter
class IdpDeletionRetryJob {

    private static final Logger LOG = LoggerFactory.getLogger(IdpDeletionRetryJob.class);

    private final RetryIdpDeletionsUseCase retry;

    IdpDeletionRetryJob(RetryIdpDeletionsUseCase retry) {
        this.retry = retry;
    }

    @Scheduled(
            fixedDelayString = "${app.account.idp-deletion-retry-delay:PT5M}",
            initialDelayString = "${app.account.idp-deletion-retry-delay:PT5M}")
    void run() {
        try {
            int done = retry.retryPendingDeletions();
            if (done > 0) {
                LOG.info("Finished {} pending account deletion(s) at the identity provider", done);
            }
        } catch (RuntimeException e) {
            LOG.error("Retrying pending account deletions failed", e);
        }
    }
}
