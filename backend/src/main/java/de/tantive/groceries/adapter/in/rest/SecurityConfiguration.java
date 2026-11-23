package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.ports.in.EndIdpSessionsUseCase;
import de.tantive.groceries.ports.in.RegisterIdpSessionUseCase;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.header.HeaderWriterFilter;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy;
import org.springframework.security.web.header.writers.CrossOriginResourcePolicyHeaderWriter.CrossOriginResourcePolicy;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import tools.jackson.databind.json.JsonMapper;

/**
 * The security filter chains of the API and the SPA (SPRING-SEC-01, SPRING-SEC-13); probes and actuator are in
 * {@link ActuatorSecurityConfiguration}. The BFF (ADR 0002): the SPA chain carries the OIDC login, the logout and the
 * back-channel logout; the API chain needs a session and answers 401 problem+json, never a redirect. The SPA document
 * and its files are public: the SPA starts the login when {@code /api/v1/me} answers 401.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RequestLimitsProperties.class)
class SecurityConfiguration {

    private static final String PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

    /** The JSON API: no content of its own, never framed, never cached (SPRING-SEC-13). */
    @Bean
    @Order(2)
    SecurityFilterChain apiChain(
            HttpSecurity http, JsonMapper mapper, RequestLimitsProperties limits, Clock clock, AuthProperties auth)
            throws Exception {
        return http.securityMatcher(PathPatternRequestMatcher.withDefaults().matcher("/api/**"))
                .authorizeHttpRequests(rules -> rules.anyRequest().authenticated())
                .addFilterBefore(
                        new AbsoluteSessionLifetimeFilter(clock, auth.sessionAbsoluteLifetime()),
                        SecurityContextHolderFilter.class)
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
    SecurityFilterChain spaChain(
            HttpSecurity http,
            JsonMapper mapper,
            RequestLimitsProperties limits,
            RateLimitProperties rateLimits,
            Clock clock,
            AuthProperties auth,
            ClientRegistrationRepository registrations,
            OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService,
            OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> tokenClient,
            RegisterIdpSessionUseCase registerSession,
            EndIdpSessionsUseCase endSessions)
            throws Exception {
        return http.authorizeHttpRequests(rules -> rules.anyRequest().permitAll())
                .csrf(csrf -> csrf.spa().ignoringRequestMatchers("/csp-reports"))
                .oauth2Login(login -> login.authorizationEndpoint(endpoint ->
                                endpoint.authorizationRequestResolver(new PromptCreateResolver(registrations)))
                        .tokenEndpoint(endpoint -> endpoint.accessTokenResponseClient(tokenClient))
                        .userInfoEndpoint(endpoint -> endpoint.oidcUserService(oidcUserService))
                        .successHandler(LoginHandlers.success(registerSession))
                        .failureHandler(LoginHandlers.failure()))
                .logout(logout -> logout.logoutUrl("/logout")
                        .addLogoutHandler(LoginHandlers.loggedOut())
                        .logoutSuccessHandler(LoginHandlers.logoutSuccess(registrations, mapper)))
                .oidcLogout(oidc -> oidc.backChannel(
                        backChannel -> backChannel.logoutHandler(LoginHandlers.backChannel(endSessions))))
                .addFilterBefore(
                        new AbsoluteSessionLifetimeFilter(clock, auth.sessionAbsoluteLifetime()),
                        SecurityContextHolderFilter.class)
                .addFilterBefore(
                        new RateLimitFilter(
                                "login-start",
                                path -> path.startsWith("/oauth2/authorization/"),
                                rateLimits.loginStartPerMinute(),
                                mapper),
                        OAuth2AuthorizationRequestRedirectFilter.class)
                .addFilterBefore(
                        new RateLimitFilter(
                                "csp-reports",
                                path -> path.equals("/csp-reports"),
                                rateLimits.cspReportsPerMinute(),
                                mapper),
                        HeaderWriterFilter.class)
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
