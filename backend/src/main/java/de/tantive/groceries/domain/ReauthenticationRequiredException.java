package de.tantive.groceries.domain;

/** A destructive account action needs a fresh login first (FR-SET-04, ADR 0003): 403 with code REAUTH_REQUIRED. */
public final class ReauthenticationRequiredException extends AccessDeniedException {

    public ReauthenticationRequiredException() {
        super("REAUTH_REQUIRED", "Bitte melde dich zur Bestätigung erneut an.");
    }
}
