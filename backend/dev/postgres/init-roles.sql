-- Local and delivered Compose installation (SPRING-REL-01): a non-superuser DDL owner for Flyway and a DML-only role for
-- the running service. All passwords are fictitious development values.
CREATE ROLE groceries_owner LOGIN PASSWORD 'groceries_owner';
CREATE ROLE groceries_app LOGIN PASSWORD 'groceries_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE groceries OWNER TO groceries_owner;
GRANT CONNECT ON DATABASE groceries TO groceries_app;
