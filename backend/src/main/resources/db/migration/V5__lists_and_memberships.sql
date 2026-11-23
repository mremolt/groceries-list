-- Lists and memberships (04 §2.1, BR-01..05, BR-10, BR-12). Structure only, no rows (SPRING-TEST-13).
-- revision moves with every change to a list or (from M3) its items; it is the ETag of the item snapshot (ADR 0006).
-- created_by is informational only (BR-02): it is cleared when that account is deleted, the list stays for its members.
CREATE TABLE lists (
    id         uuid        PRIMARY KEY,
    name       varchar(80) NOT NULL,
    created_by uuid        REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    revision   bigint      NOT NULL DEFAULT 0,
    CONSTRAINT lists_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);
CREATE INDEX lists_created_by_idx ON lists (created_by);

-- One membership per user and list. Both parents cascade: deleting a list or an account removes the membership
-- (SPRING-DP-03, BR-04, BR-05).
CREATE TABLE memberships (
    user_id   uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    list_id   uuid        NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, list_id)
);
-- the navigation reads "my lists by join time" (BR-10); list_id is looked up when counting a list's members
CREATE INDEX memberships_user_joined_idx ON memberships (user_id, joined_at);
CREATE INDEX memberships_list_idx ON memberships (list_id);
