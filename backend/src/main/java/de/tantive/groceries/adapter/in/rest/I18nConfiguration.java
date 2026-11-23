package de.tantive.groceries.adapter.in.rest;

import java.util.List;
import java.util.Locale;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * One locale resolver with an explicit supported list (SPRING-I18N-01, ADR 0005): German is the only and the default
 * language. One {@code MessageSource} over {@code messages_de.properties}, UTF-8, never falling back to the system
 * locale; declared here, so slice tests and the full application get the same bundle.
 */
@Configuration(proxyBeanMethods = false)
class I18nConfiguration {

    @Bean
    MessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @Bean
    LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(Locale.GERMAN));
        resolver.setDefaultLocale(Locale.GERMAN);
        return resolver;
    }
}
