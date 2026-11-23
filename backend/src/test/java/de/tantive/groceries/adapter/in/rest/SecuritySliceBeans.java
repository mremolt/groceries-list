package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.ports.in.EndIdpSessionsUseCase;
import de.tantive.groceries.ports.in.ProvideUserUseCase;
import de.tantive.groceries.ports.in.RegisterIdpSessionUseCase;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Doubles for the ports the security configuration needs; tests reach them with {@code @Autowired}. */
@TestConfiguration(proxyBeanMethods = false)
class SecuritySliceBeans {

    static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");

    @Bean
    Clock clock() {
        return Clock.fixed(NOW, ZoneOffset.UTC);
    }

    @Bean
    ProvideUserUseCase provideUserUseCase() {
        return Mockito.mock(ProvideUserUseCase.class);
    }

    @Bean
    RegisterIdpSessionUseCase registerIdpSessionUseCase() {
        return Mockito.mock(RegisterIdpSessionUseCase.class);
    }

    @Bean
    EndIdpSessionsUseCase endIdpSessionsUseCase() {
        return Mockito.mock(EndIdpSessionsUseCase.class);
    }
}
