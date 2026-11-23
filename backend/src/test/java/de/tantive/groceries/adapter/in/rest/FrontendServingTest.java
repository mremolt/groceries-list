package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Web slice of the SPA host: index.html with nonce, deep links, hashed files and the 404 rules of REL-FE-03, plus the
 * security headers of SPRING-SEC-13 (SPRING-REST-13, SPRING-TEST-12).
 */
@WebMvcTest(controllers = FrontendController.class)
@Import({SecurityConfiguration.class, FrontendConfiguration.class, I18nConfiguration.class, RestExceptionHandler.class})
class FrontendServingTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void servesTheDocumentWithNonceHeadersAndNoStore() {
        var result = mvc.get().uri("/").accept(MediaType.TEXT_HTML).secure(true).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).headers().hasValue("Cache-Control", "no-store");
        String csp = Objects.requireNonNull(result.getResponse().getHeader("Content-Security-Policy"));
        assertThat(csp)
                .contains("script-src 'nonce-")
                .contains("frame-ancestors 'none'")
                .contains("base-uri 'self'");
        String nonce = csp.replaceAll(".*script-src 'nonce-([^']+)'.*", "$1");
        assertThat(result).bodyText().contains("nonce=\"" + nonce + "\"").doesNotContain("CSP_NONCE");
        assertThat(result).headers().hasValue("X-Content-Type-Options", "nosniff");
        assertThat(result).headers().hasValue("Referrer-Policy", "no-referrer");
        assertThat(result).headers().containsHeader("Strict-Transport-Security");
        assertThat(result).headers().hasValue("Cross-Origin-Opener-Policy", "same-origin");
        assertThat(result).headers().containsHeader("Permissions-Policy");
        assertThat(result).headers().containsHeader("Content-Security-Policy-Report-Only");
    }

    @Test
    void usesANewNonceForEveryResponse() {
        String first = mvc.get()
                .uri("/")
                .accept(MediaType.TEXT_HTML)
                .exchange()
                .getResponse()
                .getHeader("Content-Security-Policy");
        String second = mvc.get()
                .uri("/")
                .accept(MediaType.TEXT_HTML)
                .exchange()
                .getResponse()
                .getHeader("Content-Security-Policy");

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void servesTheDocumentForADeepLink() {
        assertThat(mvc.get().uri("/listen/4711").accept(MediaType.TEXT_HTML).exchange())
                .hasStatusOk()
                .bodyText()
                .contains("<app-root");
        assertThat(mvc.get().uri("/j/some-token").accept(MediaType.TEXT_HTML).exchange())
                .hasStatusOk();
    }

    @Test
    void servesAHashedFileForAYear() {
        var result = mvc.get().uri("/main-ABC123.js").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).headers().hasValue("Cache-Control", "max-age=31536000, public, immutable");
        assertThat(mvc.get().uri("/media/Roboto-HASH12.woff2").exchange())
                .headers()
                .hasValue("Cache-Control", "max-age=31536000, public, immutable");
    }

    @Test
    void servesAnUnhashedFileBriefly() {
        assertThat(mvc.get().uri("/favicon.ico").exchange())
                .hasStatusOk()
                .headers()
                .hasValue("Cache-Control", "max-age=600, public");
    }

    @Test
    void answersANotFoundForAMissingFileInsteadOfTheDocument() {
        var result =
                mvc.get().uri("/chunk-GONE99.js").accept(MediaType.TEXT_HTML).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).doesNotContain("text/html");
        assertThat(mvc.get()
                        .uri("/media/missing.woff2")
                        .accept(MediaType.TEXT_HTML)
                        .exchange())
                .hasStatus(404);
    }

    @Test
    void answersANotFoundProblemForAnUnknownApiPath() {
        var result =
                mvc.get().uri("/api/v1/unknown").accept(MediaType.TEXT_HTML).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).doesNotContain("text/html");
    }

    @Test
    void sendsTheApiHeadersOnTheApiChain() {
        var result = mvc.get().uri("/api/v1/unknown").exchange();

        assertThat(result).headers().hasValue("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        assertThat(result).headers().hasValue("Referrer-Policy", "no-referrer");
    }
}
