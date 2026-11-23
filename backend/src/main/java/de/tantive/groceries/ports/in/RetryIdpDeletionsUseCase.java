package de.tantive.groceries.ports.in;

/** Finishes the deletion of accounts at the identity provider that failed after the product's data was erased. */
public interface RetryIdpDeletionsUseCase {

    /** Retries the open deletions, oldest first, and returns how many accounts were deleted in this run. */
    int retryPendingDeletions();
}
