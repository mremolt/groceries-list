package de.tantive.groceries.adapter.out.jpa;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** Persistence model of an item; never leaves this package (SPRING-ARCH-09/10). Created through JPA, changed by SQL. */
@Entity
@Table(name = "items")
class ItemEntity {

    @Id
    private UUID id;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private boolean done;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected ItemEntity() {}

    ItemEntity(UUID id, UUID listId, String text, boolean done, Instant createdAt) {
        this.id = id;
        this.listId = listId;
        this.text = text;
        this.done = done;
        this.createdAt = createdAt;
    }

    UUID id() {
        return id;
    }

    String text() {
        return text;
    }

    boolean done() {
        return done;
    }

    Instant createdAt() {
        return createdAt;
    }

    long version() {
        return version;
    }
}
