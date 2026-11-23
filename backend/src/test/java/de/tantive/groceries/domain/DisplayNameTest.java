package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class DisplayNameTest {

    @Test
    void trimsAndAcceptsOneToFiftyCharacters() {
        assertThat(DisplayName.of("  Alex Beispiel ").value()).isEqualTo("Alex Beispiel");
        assertThat(DisplayName.of("x".repeat(50)).value()).hasSize(50);
        assertThat(DisplayName.of("A").value()).isEqualTo("A");
    }

    @Test
    void refusesEmptyAndMissingNames() {
        assertThatThrownBy(() -> DisplayName.of("   ")).isInstanceOfSatisfying(DomainValidationException.class, e -> {
            assertThat(e.code()).isEqualTo("DISPLAY_NAME_REQUIRED");
            assertThat(e.field()).isEqualTo("displayName");
        });
        assertThatThrownBy(() -> DisplayName.of(null)).isInstanceOf(DomainValidationException.class);
    }

    @Test
    void refusesMoreThanFiftyCharacters() {
        assertThatThrownBy(() -> DisplayName.of("x".repeat(51)))
                .isInstanceOfSatisfying(
                        DomainValidationException.class,
                        e -> assertThat(e.code()).isEqualTo("DISPLAY_NAME_TOO_LONG"));
    }
}
