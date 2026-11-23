package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.config.Secret;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * The BFF's relation to the identity provider (ADR 0002, SPRING-SEC-38).
 *
 * @param issuerUri issuer URL, identical for the browser, the app on the host and the app in a container (SPRING-DEV-11)
 * @param clientId confidential client of the BFF
 * @param clientSecret client secret, read from a mounted file (SPRING-CFG-07); never printed (CFG-07)
 * @param sessionAbsoluteLifetime a session never outlives this, however active it is (SPRING-SEC-32, ADR 0002)
 * @param connectTimeout connect timeout of calls to the IdP (token endpoint, JWKS; RES-TMO-01)
 * @param readTimeout read timeout of calls to the IdP
 */
@ConfigurationProperties("app.auth")
@Validated
record AuthProperties(
        @NotBlank String issuerUri,
        @DefaultValue("groceries-bff") @NotBlank String clientId,
        @NotNull Secret clientSecret,
        @DefaultValue("30d") Duration sessionAbsoluteLifetime,
        @DefaultValue("2s") Duration connectTimeout,
        @DefaultValue("5s") Duration readTimeout) {}
