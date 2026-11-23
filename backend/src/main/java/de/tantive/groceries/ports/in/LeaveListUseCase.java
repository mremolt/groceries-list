package de.tantive.groceries.ports.in;

/** FR-LIST-04, BR-04: a member leaves; the last member leaving deletes the list. */
public interface LeaveListUseCase {

    void leaveList(LeaveListCommand command);
}
