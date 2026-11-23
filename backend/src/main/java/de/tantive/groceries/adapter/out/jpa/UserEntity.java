package de.tantive.groceries.adapter.out.jpa;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** Persistence model of an account; never leaves this package (SPRING-ARCH-09/10, SPRING-DB-11). */
@Entity
@Table(name = "users")
class UserEntity {

    @Id
    private UUID id;

    @Column(name = "idp_subject", nullable = false)
    private String subject;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    @Version
    private long version;

    protected UserEntity() {}

    UserEntity(UUID id, String subject, String email, String displayName, Instant createdAt, Instant lastLoginAt) {
        this.id = id;
        this.subject = subject;
        this.email = email;
        this.displayName = displayName;
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
    }

    void update(String newDisplayName, Instant newLastLoginAt) {
        this.displayName = newDisplayName;
        this.lastLoginAt = newLastLoginAt;
    }

    UUID id() {
        return id;
    }

    String subject() {
        return subject;
    }

    String email() {
        return email;
    }

    String displayName() {
        return displayName;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant lastLoginAt() {
        return lastLoginAt;
    }
}
