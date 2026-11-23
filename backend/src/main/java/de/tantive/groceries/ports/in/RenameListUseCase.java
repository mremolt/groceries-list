package de.tantive.groceries.ports.in;

import de.tantive.groceries.domain.ListSummary;

/** FR-LIST-02: any member renames the list. */
public interface RenameListUseCase {

    ListSummary renameList(RenameListCommand command);
}
