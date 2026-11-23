package de.tantive.groceries.adapter.out.jdbc;

import de.tantive.groceries.domain.InvitedList;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.out.ShareLinkPort;
import de.tantive.groceries.stereotype.PersistenceAdapter;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The token column of {@code lists}: not part of the list entity (it must never travel with the aggregate into a read
 * model or a log), so plain SQL (SPRING-DB-15). A token is a parameter, never concatenated into SQL.
 */
@PersistenceAdapter
class ShareLinkJdbcAdapter implements ShareLinkPort {

    private static final String FIND_BY_TOKEN = "SELECT l.id, l.name FROM lists l WHERE l.share_token = :token";

    private final JdbcClient jdbc;

    ShareLinkJdbcAdapter(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<ShareToken> tokenOf(UUID listId) {
        return jdbc.sql("SELECT share_token FROM lists WHERE id = :id")
                .param("id", listId)
                .query(String.class)
                .optional()
                .map(ShareToken::new);
    }

    @Override
    public void assignIfAbsent(UUID listId, ShareToken token) {
        jdbc.sql("UPDATE lists SET share_token = :token WHERE id = :id AND share_token IS NULL")
                .param("token", token.value())
                .param("id", listId)
                .update();
    }

    @Override
    public void replace(UUID listId, ShareToken token) {
        jdbc.sql("UPDATE lists SET share_token = :token WHERE id = :id")
                .param("token", token.value())
                .param("id", listId)
                .update();
    }

    @Override
    public Optional<InvitedList> findByToken(ShareToken token) {
        return query(FIND_BY_TOKEN, token);
    }

    @Override
    public Optional<InvitedList> findByTokenLocked(ShareToken token) {
        return query(FIND_BY_TOKEN + " FOR UPDATE OF l", token);
    }

    private Optional<InvitedList> query(String sql, ShareToken token) {
        return jdbc.sql(sql)
                .param("token", token.value())
                .query((rs, rowNum) ->
                        new InvitedList(rs.getObject("id", UUID.class), new ListName(rs.getString("name"))))
                .optional();
    }
}
