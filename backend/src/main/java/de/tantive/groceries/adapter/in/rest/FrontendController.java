package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.stereotype.WebAdapter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves {@code index.html} with the per-request CSP nonce for {@code /} and every deep link (REL-FE-03): a GET that
 * accepts text/html and matches no API, login, actuator or file path. The first path segment must not be a reserved
 * prefix and has no dot, so a missing file or an unknown API path answers 404 instead of the document.
 */
@WebAdapter
@RestController
@ConditionalOnProperty(name = "app.frontend.bundle-enabled", matchIfMissing = true)
class FrontendController {

    private static final String SEGMENT =
            "{first:(?!(?:api|oauth2|login|logout|actuator|livez|readyz|csp-reports|v3|media|icons)$)[^.]*}";

    private final IndexHtml index;

    FrontendController(IndexHtml index) {
        this.index = index;
    }

    @GetMapping(
            path = {"/", "/" + SEGMENT + "/**"},
            produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> document(HttpServletRequest request) {
        Object nonce = request.getAttribute(CspNonceFilter.NONCE_ATTRIBUTE);
        if (!(nonce instanceof String value)) {
            throw new IllegalStateException("no CSP nonce on the request: the SPA filter chain did not run");
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                .body(index.render(value));
    }
}
