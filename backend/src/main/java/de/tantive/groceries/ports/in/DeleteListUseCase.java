package de.tantive.groceries.ports.in;

/** FR-LIST-03, BR-05: any member deletes the list for everyone. */
public interface DeleteListUseCase {

    void deleteList(DeleteListCommand command);
}
