package de.tantive.groceries.ports.out;

/** The identity provider could not be reached or refused the call; the caller keeps the work to retry it. */
public class IdentityProviderUnavailableException extends Exception {

    private static final long serialVersionUID = 1L;

    public IdentityProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public IdentityProviderUnavailableException(String message) {
        super(message);
    }
}
