package de.tantive.groceries.ports.in;

/** Query: the profile of the logged-in person (ARCH-UC-03). */
public interface GetCurrentUserUseCase {

    CurrentUser currentUser(GetCurrentUserQuery query);
}
