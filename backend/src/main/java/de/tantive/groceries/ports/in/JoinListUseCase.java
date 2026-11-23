package de.tantive.groceries.ports.in;

/** FR-SHARE-03, BR-06..08, BR-12: a logged-in person becomes a member of the list behind a valid token. */
public interface JoinListUseCase {

    JoinListResult joinList(JoinListCommand command);
}
