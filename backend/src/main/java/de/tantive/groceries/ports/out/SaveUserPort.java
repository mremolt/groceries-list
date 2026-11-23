package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.User;

/** Stores an account (insert or update by id). */
public interface SaveUserPort {

    User save(User user);
}
