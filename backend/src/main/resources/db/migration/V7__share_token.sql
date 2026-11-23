-- One valid share token per list (BR-06, ADR 0008). Nullable: a list gets its token when somebody first asks for the
-- link, so existing rows need no backfill. The token is a secret: it is stored as shown (the link must be reproducible)
-- and is never part of a read model, a log line or an export. The partial unique index makes a lookup by token one
-- index probe and keeps two lists from ever sharing one.
ALTER TABLE lists ADD COLUMN share_token varchar(64);
ALTER TABLE lists ADD CONSTRAINT lists_share_token_format CHECK (share_token ~ '^[A-Za-z0-9_-]{16,64}$');
CREATE UNIQUE INDEX lists_share_token_key ON lists (share_token) WHERE share_token IS NOT NULL;
