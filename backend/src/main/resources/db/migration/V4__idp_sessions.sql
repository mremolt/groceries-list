-- Map from IdP sessions (sid) to application sessions for back-channel logout (SPRING-SEC-40). A storage location of the
-- deletion concept; rows of dead sessions are purged when a new login registers (RegisterIdpSession).
CREATE TABLE idp_sessions (
    session_id  char(36)     PRIMARY KEY,
    sid         varchar(255) NOT NULL,
    subject     varchar(255) NOT NULL,
    recorded_at timestamptz  NOT NULL
);
CREATE INDEX idp_sessions_sid_idx ON idp_sessions (sid);
CREATE INDEX idp_sessions_subject_idx ON idp_sessions (subject);
CREATE INDEX idp_sessions_recorded_at_idx ON idp_sessions (recorded_at);
