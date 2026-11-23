-- Accounts (04 §2.1). Credentials live at the identity provider (ADR 0002): no password column.
CREATE TABLE users (
    id            uuid         PRIMARY KEY,
    idp_subject   varchar(255) NOT NULL,
    email         varchar(254) NOT NULL,
    display_name  varchar(50)  NOT NULL,
    created_at    timestamptz  NOT NULL,
    last_login_at timestamptz  NOT NULL,
    version       bigint       NOT NULL DEFAULT 0,
    CONSTRAINT users_idp_subject_key UNIQUE (idp_subject),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT users_display_name_length CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 50)
);
