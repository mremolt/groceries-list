package de.tantive.groceries.adapter.out.jpa;

import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShoppingList;
import de.tantive.groceries.ports.out.DeleteListPort;
import de.tantive.groceries.ports.out.LoadListPort;
import de.tantive.groceries.ports.out.SaveListPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The list aggregate. Creation goes through JPA (entity, two-way mapping, schema validation); everything that is
 * set-based or must not race — the membership-scoped reads, the locked read, the rename that moves the revision, the
 * delete — is plain SQL of the same adapter (SPRING-DB-15, SPRING-ARCH-11). No entity is read after such an update, so
 * the persistence context never serves a stale list.
 */
@PersistenceAdapter
class ListPersistenceAdapter implements LoadListPort, SaveListPort, DeleteListPort {

    private static final String SELECT_FOR_MEMBER = """
            SELECT l.id, l.name, l.created_by, l.created_at, l.updated_at, l.revision
              FROM lists l
             WHERE l.id = :listId
               AND EXISTS (SELECT 1 FROM memberships m WHERE m.list_id = l.id AND m.user_id = :userId)
            """;

    private final ListRepository repository;
    private final JdbcClient jdbc;

    ListPersistenceAdapter(ListRepository repository, JdbcClient jdbc) {
        this.repository = repository;
        this.jdbc = jdbc;
    }

    @Override
    public Optional<ShoppingList> findForMember(UUID listId, UUID userId) {
        return query(SELECT_FOR_MEMBER, listId, userId);
    }

    @Override
    public Optional<ShoppingList> findForMemberLocked(UUID listId, UUID userId) {
        return query(SELECT_FOR_MEMBER + " FOR UPDATE OF l", listId, userId);
    }

    @Override
    public ShoppingList create(ShoppingList list) {
        ListEntity saved = repository.saveAndFlush(
                new ListEntity(list.id(), list.name().value(), list.createdBy(), list.createdAt(), list.updatedAt()));
        return toDomain(saved);
    }

    @Override
    public void rename(UUID listId, ListName name, Instant now) {
        // a set, atomic in the database: concurrent renames and item changes never fail, the last write wins (ADR 0007)
        jdbc.sql("UPDATE lists SET name = :name, updated_at = :now, revision = revision + 1 WHERE id = :id")
                .param("name", name.value())
                .param("now", Timestamp.from(now))
                .param("id", listId)
                .update();
    }

    @Override
    public void delete(UUID listId) {
        // memberships (and later items) go with the list through ON DELETE CASCADE (BR-05, SPRING-DP-03)
        jdbc.sql("DELETE FROM lists WHERE id = :id").param("id", listId).update();
    }

    private Optional<ShoppingList> query(String sql, UUID listId, UUID userId) {
        return jdbc.sql(sql)
                .param("listId", listId)
                .param("userId", userId)
                .query((rs, rowNum) -> new ShoppingList(
                        rs.getObject("id", UUID.class),
                        new ListName(rs.getString("name")),
                        rs.getObject("created_by", UUID.class),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant(),
                        rs.getLong("revision")))
                .optional();
    }

    private static ShoppingList toDomain(ListEntity entity) {
        return new ShoppingList(
                entity.id(),
                new ListName(entity.name()),
                entity.createdBy(),
                entity.createdAt(),
                entity.updatedAt(),
                entity.revision());
    }
}
