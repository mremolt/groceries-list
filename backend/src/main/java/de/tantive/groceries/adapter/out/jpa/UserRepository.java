package de.tantive.groceries.adapter.out.jpa;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findBySubject(String subject);

    boolean existsByEmail(String email);
}
