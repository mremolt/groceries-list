package de.tantive.groceries.adapter.out.jpa;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Persistence model of a list; never leaves this package (SPRING-ARCH-09/10, SPRING-DB-11). The Hibernate version is the
 * list's revision: it moves on every change (ADR 0006), also on those made by set-based SQL of the same adapter.
 */
@Entity
@Table(name = "lists")
class ListEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "created_by")
    private @Nullable UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "revision", nullable = false)
    private long revision;

    protected ListEntity() {}

    ListEntity(UUID id, String name, @Nullable UUID createdBy, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    UUID id() {
        return id;
    }

    String name() {
        return name;
    }

    @Nullable
    UUID createdBy() {
        return createdBy;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant updatedAt() {
        return updatedAt;
    }

    long revision() {
        return revision;
    }
}
