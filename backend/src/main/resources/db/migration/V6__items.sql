-- Items of a list (04 §2.1, BR-09, BR-12). Structure only, no rows (SPRING-TEST-13).
-- version moves with every change of the item (Hibernate @Version, set-based updates add one); the text is free text of
-- the members and may name people: it is personal data of the members of the list (DP-INV-03).
CREATE TABLE items (
    id         uuid         PRIMARY KEY,
    list_id    uuid         NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    text       varchar(200) NOT NULL,
    done       boolean      NOT NULL DEFAULT false,
    created_at timestamptz  NOT NULL,
    version    bigint       NOT NULL DEFAULT 0,
    CONSTRAINT items_text_length CHECK (char_length(btrim(text)) BETWEEN 1 AND 200)
);
-- the list reads its items by creation time (BR-09); the same index serves the per-list count (BR-12)
CREATE INDEX items_list_created_idx ON items (list_id, created_at, id);
-- the navigation counts open items per list (API-N1-05)
CREATE INDEX items_open_idx ON items (list_id) WHERE NOT done;
