package de.tantive.groceries.ports.out;

/** The identity provider's administration, as far as the product needs it (SPRING-SEC-41). */
public interface IdentityProviderPort {

    /** Deletes the account of the IdP subject. Idempotent: an account that is already gone is a success. */
    void deleteUser(String subject) throws IdentityProviderUnavailableException;
}
