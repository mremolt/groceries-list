package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.domain.Membership;
import de.tantive.groceries.ports.out.MembershipPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Memberships are a join table without invariants of their own: plain SQL, no entity (SPRING-DB-15, SPRING-ARCH-10). */
@PersistenceAdapter
class MembershipJdbcAdapter implements MembershipPort {

    private final JdbcClient jdbc;

    MembershipJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int lockAndCountListsOf(UUID userId) {
        // the user's row is the lock every creation of a list takes before it counts (SPRING-DB-22, BR-12)
        jdbc.sql("SELECT id FROM users WHERE id = :id FOR UPDATE")
                .param("id", userId)
                .query()
                .listOfRows();
        return jdbc.sql("SELECT count(*) FROM memberships WHERE user_id = :id")
                .param("id", userId)
                .query(Integer.class)
                .single();
    }

    @Override
    public void add(Membership membership) {
        jdbc.sql("INSERT INTO memberships (user_id, list_id, joined_at) VALUES (:user, :list, :joined)")
                .param("user", membership.userId())
                .param("list", membership.listId())
                .param("joined", Timestamp.from(membership.joinedAt()))
                .update();
    }

    @Override
    public void remove(UUID listId, UUID userId) {
        jdbc.sql("DELETE FROM memberships WHERE list_id = :list AND user_id = :user")
                .param("list", listId)
                .param("user", userId)
                .update();
    }

    @Override
    public int countMembers(UUID listId) {
        return jdbc.sql("SELECT count(*) FROM memberships WHERE list_id = :list")
                .param("list", listId)
                .query(Integer.class)
                .single();
    }

    @Override
    public boolean isMember(UUID listId, UUID userId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM memberships WHERE list_id = :list AND user_id = :user)")
                .param("list", listId)
                .param("user", userId)
                .query(Boolean.class)
                .single();
    }
}
