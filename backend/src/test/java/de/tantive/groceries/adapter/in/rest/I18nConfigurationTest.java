package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSource;

/** German is the only language: a request locale without a bundle (the JVM's en_US) still gets the German text. */
class I18nConfigurationTest {

    private final MessageSource messages = new I18nConfiguration().messageSource();

    @Test
    void answersInGermanForALocaleWithoutABundle() {
        assertThat(messages.getMessage("error.NOT_FOUND.title", null, Locale.US))
                .isEqualTo("Nicht gefunden");
    }
}
