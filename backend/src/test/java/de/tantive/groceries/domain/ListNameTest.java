package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Chicago style: a pure value object (TEST-ARCH-01, TEST-TDD-10). Rule: name 1–80 characters after trimming (04 §2.1). */
class ListNameTest {

    @Test
    void trimsSurroundingWhitespace() {
        assertThat(ListName.of("  Wocheneinkauf \n").value()).isEqualTo("Wocheneinkauf");
    }

    @Test
    void acceptsEightyCharactersAfterTrimming() {
        String eighty = "x".repeat(80);

        assertThat(ListName.of("  " + eighty + "  ").value()).isEqualTo(eighty);
    }

    @Test
    void keepsDuplicateLookingNamesAndUnicode() {
        assertThat(ListName.of("Grillabend 🍖 Samstag").value()).isEqualTo("Grillabend 🍖 Samstag");
    }

    @Test
    void refusesABlankName() {
        assertThatThrownBy(() -> ListName.of("   ")).isInstanceOfSatisfying(DomainValidationException.class, e -> {
            assertThat(e.code()).isEqualTo("NAME_REQUIRED");
            assertThat(e.field()).isEqualTo("name");
            assertThat(e.getMessage()).isEqualTo("Bitte gib einen Namen ein.");
        });
    }

    @Test
    void refusesAMissingName() {
        assertThatThrownBy(() -> ListName.of(null))
                .isInstanceOfSatisfying(
                        DomainValidationException.class,
                        e -> assertThat(e.code()).isEqualTo("NAME_REQUIRED"));
    }

    @Test
    void refusesANameOfEightyOneCharacters() {
        assertThatThrownBy(() -> ListName.of("x".repeat(81)))
                .isInstanceOfSatisfying(DomainValidationException.class, e -> {
                    assertThat(e.code()).isEqualTo("NAME_TOO_LONG");
                    assertThat(e.field()).isEqualTo("name");
                    assertThat(e.getMessage()).isEqualTo("Der Name darf höchstens 80 Zeichen lang sein.");
                });
    }
}
