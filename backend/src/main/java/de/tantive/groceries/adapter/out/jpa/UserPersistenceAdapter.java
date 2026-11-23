package de.tantive.groceries.adapter.out.jpa;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserEmailTakenException;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

@PersistenceAdapter
class UserPersistenceAdapter implements LoadUserPort, SaveUserPort {

    private static final String EMAIL_CONSTRAINT = "users_email_key";

    private final UserRepository repository;

    UserPersistenceAdapter(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<User> findBySubject(String subject) {
        return repository.findBySubject(subject).map(UserPersistenceAdapter::toDomain);
    }

    @Override
    public Optional<User> findById(UUID id) {
        return repository.findById(id).map(UserPersistenceAdapter::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return repository.existsByEmail(email);
    }

    @Override
    public User save(User user) {
        UserEntity entity = repository
                .findById(user.id())
                .map(existing -> {
                    existing.update(user.displayName(), user.lastLoginAt());
                    return existing;
                })
                .orElseGet(() -> toEntity(user));
        try {
            return toDomain(repository.saveAndFlush(entity));
        } catch (DataIntegrityViolationException violation) {
            if (violatesEmailConstraint(violation)) {
                throw new UserEmailTakenException();
            }
            throw violation;
        }
    }

    /** Constraint violations are mapped by constraint name, never by message text (SPRING-DB-18). */
    private static boolean violatesEmailConstraint(Throwable violation) {
        for (Throwable cause = violation; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException hibernate
                    && EMAIL_CONSTRAINT.equals(hibernate.getConstraintName())) {
                return true;
            }
        }
        return false;
    }

    private static User toDomain(UserEntity entity) {
        return new User(
                entity.id(),
                entity.subject(),
                entity.email(),
                entity.displayName(),
                entity.createdAt(),
                entity.lastLoginAt());
    }

    private static UserEntity toEntity(User user) {
        return new UserEntity(
                user.id(), user.subject(), user.email(), user.displayName(), user.createdAt(), user.lastLoginAt());
    }
}
