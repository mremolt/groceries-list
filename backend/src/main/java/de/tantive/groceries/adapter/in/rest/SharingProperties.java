package de.tantive.groceries.adapter.in.rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Settings of the share link (BR-06, NFR-SEC-05). Public values only (CFG-11).
 *
 * @param publicBaseUrl the address people reach the app at, without a trailing path: the link is
 *     {@code <publicBaseUrl>/j/<token>}. Required: it cannot be derived from a request behind a proxy that is not
 *     validated (SPRING-SEC-12), and a wrong default would put dead links into messengers.
 */
@ConfigurationProperties("app.sharing")
@Validated
public record SharingProperties(
        @NotBlank @Pattern(regexp = "https?://[^\\s/?#]+(:\\d+)?/?", message = "must be an http(s) origin")
        String publicBaseUrl) {

    /** The complete link of a token. */
    public String linkOf(String token) {
        return publicBaseUrl.replaceAll("/+$", "") + "/j/" + token;
    }
}
