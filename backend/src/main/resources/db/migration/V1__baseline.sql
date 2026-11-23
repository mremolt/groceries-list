-- Baseline: rights of the DML-only application role (SPRING-REL-03, SPRING-SEC-27). Structure only, no rows
-- (SPRING-TEST-13). Tables are added by later migrations; default privileges cover them.
GRANT USAGE ON SCHEMA ${flyway:defaultSchema} TO ${app-role};
ALTER DEFAULT PRIVILEGES IN SCHEMA ${flyway:defaultSchema}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app-role};
ALTER DEFAULT PRIVILEGES IN SCHEMA ${flyway:defaultSchema}
    GRANT USAGE, SELECT ON SEQUENCES TO ${app-role};
