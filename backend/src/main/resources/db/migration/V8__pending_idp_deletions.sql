-- Outbox of identity-provider accounts that still have to be deleted after the product's data was erased (FR-SET-04,
-- ADR 0003). The row exists only between the erasure and the successful call to the identity provider; it holds the
-- pseudonymous IdP subject and a time, no name or address. A storage location of the deletion concept (DP-DEL).
CREATE TABLE pending_idp_deletions (
    idp_subject varchar(255) PRIMARY KEY,
    recorded_at timestamptz  NOT NULL
);
CREATE INDEX pending_idp_deletions_recorded_idx ON pending_idp_deletions (recorded_at);
