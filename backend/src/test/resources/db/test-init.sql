-- Test infrastructure (SPRING-DB-19): the DML-only application role. Not a superuser, owns nothing. The migrations run
-- as the container user, so the default privileges of V1 apply to this role.
CREATE ROLE app_dml LOGIN PASSWORD 'app_dml' NOSUPERUSER NOCREATEDB NOCREATEROLE;
