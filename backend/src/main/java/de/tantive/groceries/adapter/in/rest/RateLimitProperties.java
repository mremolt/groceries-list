package de.tantive.groceries.adapter.in.rest;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Per-client-address limits of the app's own public endpoints (SPRING-SEC-21). Login throttling itself belongs to the
 * IdP; these limits protect the endpoints that allocate server state without a login.
 *
 * @param loginStartPerMinute requests per minute and address to {@code /oauth2/authorization/*} (creates a session)
 * @param cspReportsPerMinute requests per minute and address to {@code /csp-reports}
 * @param invitationsPerMinute requests per minute and address to the public invitation endpoints (lookup, remember)
 * @param joinPerMinute requests per minute to the join endpoint, counted per address and, separately, per person
 */
@ConfigurationProperties("app.rate-limits")
@Validated
record RateLimitProperties(
        @DefaultValue("10") @Positive int loginStartPerMinute,
        @DefaultValue("60") @Positive int cspReportsPerMinute,
        @DefaultValue("30") @Positive int invitationsPerMinute,
        @DefaultValue("20") @Positive int joinPerMinute) {}
