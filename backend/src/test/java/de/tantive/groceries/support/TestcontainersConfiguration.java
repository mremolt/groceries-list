package de.tantive.groceries.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * The shared containers of every integration test (SPRING-TEST-04, SPRING-DB-01): PostgreSQL in the production major
 * version with the DML-only role of SPRING-DB-19. One container per JVM.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    public static final String DML_ROLE = "app_dml";
    public static final String DML_PASSWORD = "app_dml";

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer("postgres:18").withInitScript("db/test-init.sql");
    }

    /** {@code @ServiceConnection} leaves the datasource username unset, so the Flyway placeholder is set here (SPRING-REL-03). */
    @Bean
    DynamicPropertyRegistrar flywayPlaceholders() {
        return registry -> registry.add("spring.flyway.placeholders.app-role", () -> DML_ROLE);
    }
}
