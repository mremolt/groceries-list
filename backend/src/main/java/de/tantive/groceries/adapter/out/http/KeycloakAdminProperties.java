package de.tantive.groceries.adapter.out.http;

import de.tantive.groceries.config.Secret;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * The product's administration client at the identity provider (SPRING-SEC-41): a service account that may delete users,
 * nothing else. Its secret is a mounted file like the login client's (SPRING-CFG-07) and is never printed.
 *
 * @param issuerUri the realm's issuer URL; the admin API is derived from it
 * @param clientId the service-account client
 * @param clientSecret its secret
 * @param connectTimeout connect timeout of every call (RES-TMO-01)
 * @param readTimeout read timeout of every call
 */
@ConfigurationProperties("app.idp-admin")
@Validated
record KeycloakAdminProperties(
        @NotBlank String issuerUri,
        @DefaultValue("groceries-admin") @NotBlank String clientId,
        @NotNull Secret clientSecret,
        @DefaultValue("2s") Duration connectTimeout,
        @DefaultValue("5s") Duration readTimeout) {}
