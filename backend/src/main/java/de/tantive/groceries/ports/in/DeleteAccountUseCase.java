package de.tantive.groceries.ports.in;

/** FR-SET-04, BR-04: deletes the caller's account, memberships and the lists they were the last member of. */
public interface DeleteAccountUseCase {

    void deleteAccount(DeleteAccountCommand command);
}
