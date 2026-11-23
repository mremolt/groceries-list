package de.tantive.groceries.adapter.out.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.tantive.groceries.domain.User;
import de.tantive.groceries.domain.UserEmailTakenException;
import de.tantive.groceries.ports.out.LoadUserPort;
import de.tantive.groceries.ports.out.SaveUserPort;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Outgoing adapter against the real PostgreSQL with the real migrations (TEST-ARCH-04, SPRING-DB-14). */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test"
        })
@Import(TestcontainersConfiguration.class)
class UserPersistenceAdapterIT {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Autowired
    LoadUserPort load;

    @Autowired
    SaveUserPort save;

    @Autowired
    JdbcClient jdbc;

    @Test
    void storesAndLoadsAnAccountBySubjectAndId() {
        String subject = "sub-" + UUID.randomUUID();
        User saved = save.save(User.register(UUID.randomUUID(), subject, subject + "@example.test", "Alice", NOW));

        assertThat(load.findBySubject(subject)).contains(saved);
        assertThat(load.findById(saved.id())).contains(saved);
        assertThat(load.existsByEmail(saved.email())).isTrue();
        assertThat(load.existsByEmail("nobody@example.test")).isFalse();
    }

    @Test
    void updatesTheLoginTimeOfAnExistingAccountInPlace() {
        String subject = "sub-" + UUID.randomUUID();
        User first = save.save(User.register(UUID.randomUUID(), subject, subject + "@example.test", "Alice", NOW));

        save.save(first.loggedIn("Alice N.", NOW.plusSeconds(5)));

        assertThat(load.findById(first.id())).hasValueSatisfying(user -> {
            assertThat(user.displayName()).isEqualTo("Alice N.");
            assertThat(user.lastLoginAt()).isEqualTo(NOW.plusSeconds(5));
        });
        assertThat(jdbc.sql("select count(*) from users where idp_subject = ?")
                        .param(subject)
                        .query(Long.class)
                        .single())
                .isEqualTo(1L);
    }

    @Test
    void mapsTheUniqueEmailConstraintToADomainConflict() {
        String email = "dup-" + UUID.randomUUID() + "@example.test";
        save.save(User.register(UUID.randomUUID(), "sub-" + UUID.randomUUID(), email, "One", NOW));

        assertThatThrownBy(() ->
                        save.save(User.register(UUID.randomUUID(), "sub-" + UUID.randomUUID(), email, "Two", NOW)))
                .isInstanceOf(UserEmailTakenException.class);
    }
}
