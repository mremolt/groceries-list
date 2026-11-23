package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ItemTextTest {

    @Test
    void trimsTheText() {
        assertThat(ItemText.of("  Milch  ").value()).isEqualTo("Milch");
    }

    @Test
    void refusesAnEmptyOrMissingTextWithTextRequired() {
        assertThatThrownBy(() -> ItemText.of("   ")).isInstanceOfSatisfying(DomainValidationException.class, e -> {
            assertThat(e.code()).isEqualTo("TEXT_REQUIRED");
            assertThat(e.field()).isEqualTo("text");
        });
        assertThatThrownBy(() -> ItemText.of(null)).isInstanceOf(DomainValidationException.class);
    }

    @Test
    void acceptsTwoHundredAndRefusesTwoHundredAndOneCharactersAfterTrimming() {
        assertThat(ItemText.of(" " + "a".repeat(200) + " ").value()).hasSize(200);
        assertThatThrownBy(() -> ItemText.of("a".repeat(201)))
                .isInstanceOfSatisfying(
                        DomainValidationException.class,
                        e -> assertThat(e.code()).isEqualTo("TEXT_TOO_LONG"));
    }

    @Test
    void countsCodePointsNotUtf16Units() {
        assertThat(ItemText.of("🥛".repeat(200)).value()).isNotEmpty();
    }
}
