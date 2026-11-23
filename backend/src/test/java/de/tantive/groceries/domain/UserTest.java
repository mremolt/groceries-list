package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Chicago style: the domain type is a pure function of its inputs (TEST-TDD-10, TEST-ARCH-01). */
class UserTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-0000000000aa");

    @Test
    void storesTheEmailTrimmedAndLowerCased() {
        User user = User.register(ID, "sub-1", "  Alice@Example.TEST ", "Alice", NOW);

        assertThat(user.email()).isEqualTo("alice@example.test");
    }

    @Test
    void trimsTheDisplayName() {
        assertThat(User.register(ID, "sub-1", "a@example.test", "  Alice  ", NOW)
                        .displayName())
                .isEqualTo("Alice");
    }

    @Test
    void fallsBackToTheLocalPartOfTheEmailWhenTheDisplayNameIsBlank() {
        assertThat(User.register(ID, "sub-1", "alice@example.test", "   ", NOW).displayName())
                .isEqualTo("alice");
    }

    @Test
    void cutsTheFallbackAndOverlongNamesAtFiftyCharacters() {
        String longName = "x".repeat(80);

        assertThat(User.register(ID, "sub-1", "a@example.test", longName, NOW).displayName())
                .hasSize(50);
    }

    @Test
    void rejectsAnAddressWithoutAtSign() {
        assertThatThrownBy(() -> User.register(ID, "sub-1", "not-an-address", "Alice", NOW))
                .isInstanceOf(DomainValidationException.class)
                .extracting(e -> ((DomainValidationException) e).code())
                .isEqualTo("EMAIL_INVALID");
    }

    @Test
    void recordsTheLoginTimeAndTakesOverTheCurrentDisplayName() {
        User user = User.register(ID, "sub-1", "a@example.test", "Alice", NOW);
        Instant later = NOW.plusSeconds(60);

        User updated = user.loggedIn("Alice Renamed", later);

        assertThat(updated.lastLoginAt()).isEqualTo(later);
        assertThat(updated.displayName()).isEqualTo("Alice Renamed");
        assertThat(updated.createdAt()).isEqualTo(NOW);
        assertThat(updated.id()).isEqualTo(ID);
    }
}
