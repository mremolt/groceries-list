package de.tantive.groceries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.tantive.groceries.support.TestcontainersConfiguration;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The real migrations run against PostgreSQL, and the DML-only role gets what V1 grants, nothing more (SPRING-DB-14,
 * SPRING-DB-19, SPRING-REL-03): data rights on tables the migration role creates later, but no schema changes.
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test-only"
        })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class MigrationRolesIT {

    private static final String INSUFFICIENT_PRIVILEGE = "42501";

    @Autowired
    DataSource owner;

    @Test
    void appliesTheBaselineMigration() {
        Integer applied = new JdbcTemplate(owner)
                .queryForObject("select count(*) from flyway_schema_history where success", Integer.class);

        assertThat(applied).isGreaterThanOrEqualTo(1);
    }

    @Test
    void theDmlRoleHasDataRightsOnTheListTablesAndCannotChangeThem() throws SQLException {
        try (Connection dml = connectAsDmlRole();
                Statement statement = dml.createStatement()) {
            assertThat(statement.execute("select count(*) from lists")).isTrue();
            assertThat(statement.execute("select count(*) from memberships")).isTrue();
            assertThatThrownBy(() -> statement.execute("alter table lists add column nope int"))
                    .isInstanceOfSatisfying(
                            SQLException.class, e -> assertThat(e.getSQLState()).isEqualTo(INSUFFICIENT_PRIVILEGE));
        }
    }

    @Test
    void theDmlRoleReadsAndWritesTablesCreatedLaterButCannotChangeTheSchema() throws SQLException {
        new JdbcTemplate(owner).execute("create table dml_probe (id int primary key, note text)");
        try (Connection dml = connectAsDmlRole();
                Statement statement = dml.createStatement()) {
            assertThat(statement.executeUpdate("insert into dml_probe values (1, 'a')"))
                    .isEqualTo(1);
            assertThat(statement.executeUpdate("update dml_probe set note = 'b'"))
                    .isEqualTo(1);
            assertThat(statement.executeUpdate("delete from dml_probe")).isEqualTo(1);

            assertThat(sqlStateOf(() -> statement.execute("create table forbidden (id int)")))
                    .isEqualTo(INSUFFICIENT_PRIVILEGE);
            assertThat(sqlStateOf(() -> statement.execute("drop table dml_probe")))
                    .isEqualTo("42501");
        } finally {
            new JdbcTemplate(owner).execute("drop table dml_probe");
        }
    }

    private Connection connectAsDmlRole() throws SQLException {
        String url = new JdbcTemplate(owner)
                .execute((Connection connection) -> connection.getMetaData().getURL());
        return DriverManager.getConnection(
                url, TestcontainersConfiguration.DML_ROLE, TestcontainersConfiguration.DML_PASSWORD);
    }

    private static String sqlStateOf(SqlAction action) {
        Throwable thrown = catchThrowable(action);
        assertThat(thrown).isInstanceOf(SQLException.class);
        return ((SQLException) thrown).getSQLState();
    }

    private static Throwable catchThrowable(SqlAction action) {
        return assertThatThrownBy(action::run).actual();
    }

    @FunctionalInterface
    private interface SqlAction {
        void run() throws SQLException;
    }
}
