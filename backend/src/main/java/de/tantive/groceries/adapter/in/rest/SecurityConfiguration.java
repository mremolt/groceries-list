package de.tantive.groceries.adapter.in.rest;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.HeaderWriterFilter;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy;
import org.springframework.security.web.header.writers.CrossOriginResourcePolicyHeaderWriter.CrossOriginResourcePolicy;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import tools.jackson.databind.json.JsonMapper;

/**
 * The security filter chains of the API and the SPA (SPRING-SEC-01, SPRING-SEC-13); probes and actuator are in
 * {@link ActuatorSecurityConfiguration}. Authentication is added to the API and SPA chains with the login in M1; until then every path is public.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RequestLimitsProperties.class)
class SecurityConfiguration {

    private static final String PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

    /** The JSON API: no content of its own, never framed, never cached (SPRING-SEC-13). */
    @Bean
    @Order(2)
    SecurityFilterChain apiChain(HttpSecurity http, JsonMapper mapper, RequestLimitsProperties limits)
            throws Exception {
        return http.securityMatcher(PathPatternRequestMatcher.withDefaults().matcher("/api/**"))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.spa())
                .headers(headers -> apiHeaders(headers))
                .exceptionHandling(handling -> handling.authenticationEntryPoint(ProblemJson.unauthorized(mapper))
                        .accessDeniedHandler(ProblemJson.forbidden(mapper)))
                .addFilterBefore(
                        new RequestSizeLimitFilter(limits.maxBodySize().toBytes(), mapper), HeaderWriterFilter.class)
                .build();
    }

    /** Everything else: the SPA document and its files, public bootstrap data, the CSP report endpoint. */
    @Bean
    @Order(3)
    SecurityFilterChain spaChain(HttpSecurity http, JsonMapper mapper, RequestLimitsProperties limits)
            throws Exception {
        return http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.spa().ignoringRequestMatchers("/csp-reports"))
                .headers(headers -> headers.httpStrictTransportSecurity(
                                hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
                        .permissionsPolicyHeader(permissions -> permissions.policy(PERMISSIONS_POLICY))
                        .crossOriginOpenerPolicy(policy -> policy.policy(CrossOriginOpenerPolicy.SAME_ORIGIN))
                        .crossOriginResourcePolicy(policy -> policy.policy(CrossOriginResourcePolicy.SAME_ORIGIN)))
                .exceptionHandling(handling -> handling.authenticationEntryPoint(ProblemJson.unauthorized(mapper))
                        .accessDeniedHandler(ProblemJson.forbidden(mapper)))
                .addFilterBefore(
                        new RequestSizeLimitFilter(limits.maxBodySize().toBytes(), mapper), HeaderWriterFilter.class)
                .addFilterAfter(new CspNonceFilter(), HeaderWriterFilter.class)
                .build();
    }

    private static void apiHeaders(HeadersConfigurer<HttpSecurity> headers) {
        headers.httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                .contentTypeOptions(Customizer.withDefaults())
                .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                .crossOriginResourcePolicy(policy -> policy.policy(CrossOriginResourcePolicy.SAME_ORIGIN));
    }
}
