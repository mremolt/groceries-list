package de.tantive.groceries.adapter.out.jpa;

import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ItemText;
import de.tantive.groceries.ports.out.ItemPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The items of a list. Creation goes through JPA; the updates are set-based SQL that add one to the version and, in the
 * same transaction, move the revision of the list (ADR 0006, ADR 0007: last write wins, no precondition). No entity is
 * read after such an update. The membership of the caller was checked by the use case.
 */
@PersistenceAdapter
class ItemPersistenceAdapter implements ItemPort {

    private static final String COLUMNS = "id, text, done, created_at, version";

    private final ItemRepository repository;
    private final JdbcClient jdbc;

    ItemPersistenceAdapter(ItemRepository repository, JdbcClient jdbc) {
        this.repository = repository;
        this.jdbc = jdbc;
    }

    @Override
    public List<Item> findAllOf(UUID listId) {
        // hard upper bound of BR-12, enforced by the query itself (SPRING-DB-12); served by items_list_created_idx
        return jdbc.sql("SELECT " + COLUMNS
                        + " FROM items WHERE list_id = :listId ORDER BY created_at ASC, id ASC LIMIT "
                        + Item.MAX_ITEMS_PER_LIST)
                .param("listId", listId)
                .query(ItemPersistenceAdapter::item)
                .list();
    }

    @Override
    public int countOf(UUID listId) {
        return jdbc.sql("SELECT count(*) FROM items WHERE list_id = :listId")
                .param("listId", listId)
                .query(Integer.class)
                .single();
    }

    @Override
    public Item add(UUID listId, Item item, Instant now) {
        ItemEntity saved = repository.saveAndFlush(
                new ItemEntity(item.id(), listId, item.text().value(), item.done(), item.createdAt()));
        touchList(listId, now);
        return new Item(saved.id(), new ItemText(saved.text()), saved.done(), saved.createdAt(), saved.version());
    }

    @Override
    public Optional<Item> update(
            UUID listId, UUID itemId, @Nullable ItemText text, @Nullable Boolean done, Instant now) {
        Optional<Item> updated = jdbc.sql("""
                        UPDATE items
                           SET text = COALESCE(:text, text), done = COALESCE(:done, done), version = version + 1
                         WHERE id = :id AND list_id = :listId
                        RETURNING\s""" + COLUMNS)
                .param("text", text == null ? null : text.value())
                .param("done", done)
                .param("id", itemId)
                .param("listId", listId)
                .query(ItemPersistenceAdapter::item)
                .optional();
        updated.ifPresent(item -> touchList(listId, now));
        return updated;
    }

    @Override
    public boolean delete(UUID listId, UUID itemId, Instant now) {
        int removed = jdbc.sql("DELETE FROM items WHERE id = :id AND list_id = :listId")
                .param("id", itemId)
                .param("listId", listId)
                .update();
        if (removed > 0) {
            touchList(listId, now);
        }
        return removed > 0;
    }

    @Override
    public int deleteChecked(UUID listId, Set<UUID> itemIds, Instant now) {
        int removed = jdbc.sql("DELETE FROM items WHERE list_id = :listId AND done AND id IN (:ids)")
                .param("listId", listId)
                .param("ids", itemIds)
                .update();
        if (removed > 0) {
            touchList(listId, now);
        }
        return removed;
    }

    /** An item change is a list change: the revision is the ETag of the item snapshot (ADR 0006). */
    private void touchList(UUID listId, Instant now) {
        jdbc.sql("UPDATE lists SET updated_at = :now, revision = revision + 1 WHERE id = :id")
                .param("now", Timestamp.from(now))
                .param("id", listId)
                .update();
    }

    private static Item item(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new Item(
                rs.getObject("id", UUID.class),
                new ItemText(rs.getString("text")),
                rs.getBoolean("done"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getLong("version"));
    }
}
