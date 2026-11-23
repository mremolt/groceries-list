package de.tantive.groceries.adapter.in.rest;

import org.springframework.boot.actuate.endpoint.web.WebServerNamespace;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.util.matcher.RequestMatcher;

/** Probes stay reachable without a session (SPRING-OBS-02); everything else of actuator is denied on this chain. */
@Configuration(proxyBeanMethods = false)
class ActuatorSecurityConfiguration {

    /** Probes on the server port and actuator on the management port (SPRING-OBS-01/02). */
    @Bean
    @Order(1)
    SecurityFilterChain actuatorChain(HttpSecurity http) throws Exception {
        RequestMatcher probesOnServerPort =
                EndpointRequest.toAdditionalPaths(WebServerNamespace.SERVER, HealthEndpoint.class);
        return http.securityMatchers(
                        matchers -> matchers.requestMatchers(EndpointRequest.toAnyEndpoint(), probesOnServerPort))
                .authorizeHttpRequests(auth -> auth.requestMatchers(probesOnServerPort)
                        .permitAll()
                        .requestMatchers(EndpointRequest.to(HealthEndpoint.class, InfoEndpoint.class))
                        .permitAll()
                        .anyRequest()
                        .denyAll())
                .headers(headers -> headers.httpStrictTransportSecurity(
                                hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
                        .contentSecurityPolicy(
                                csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
                .build();
    }
}
