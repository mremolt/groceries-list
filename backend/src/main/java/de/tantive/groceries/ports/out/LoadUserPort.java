package de.tantive.groceries.ports.out;

import de.tantive.groceries.domain.User;
import java.util.Optional;
import java.util.UUID;

/** Reads accounts. */
public interface LoadUserPort {

    Optional<User> findBySubject(String subject);

    Optional<User> findById(UUID id);

    boolean existsByEmail(String email);
}
