package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.stereotype.WebAdapter;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Receives CSP violation reports (SPRING-SEC-13, NG-SEC-05): public, exempt from CSRF because browsers send no XSRF
 * header, size-limited by {@link RequestSizeLimitFilter}. Each report is logged scrubbed: the directive, the blocked
 * origin and the document path without query or fragment. Never the report body (SPRING-LOG-08, DP-TEL-01).
 */
@WebAdapter
@RestController
class CspReportController {

    private static final Logger LOG = LoggerFactory.getLogger(CspReportController.class);
    private static final int MAX_FIELD = 200;

    private final JsonMapper mapper;

    CspReportController(JsonMapper mapper) {
        this.mapper = mapper;
    }

    @PostMapping(
            path = "/csp-reports",
            consumes = {"application/csp-report", "application/reports+json"})
    ResponseEntity<Void> report(@RequestBody String body) {
        try {
            JsonNode root = mapper.readTree(body);
            if (root.isArray()) {
                root.forEach(entry -> log(entry.path("body"), "effectiveDirective", "blockedURL", "documentURL"));
            } else {
                log(root.path("csp-report"), "effective-directive", "blocked-uri", "document-uri");
            }
        } catch (RuntimeException invalid) {
            LOG.debug("Unreadable CSP report ignored");
        }
        return ResponseEntity.noContent().build();
    }

    private static void log(JsonNode report, String directive, String blocked, String document) {
        LOG.warn(
                "CSP violation directive={} blocked={} document={}",
                scrub(report.path(directive).asString("")),
                origin(report.path(blocked).asString("")),
                path(report.path(document).asString("")));
    }

    private static String origin(String value) {
        try {
            URI uri = URI.create(value);
            if (uri.getScheme() != null && uri.getHost() != null) {
                return scrub(uri.getScheme() + "://" + uri.getHost());
            }
        } catch (IllegalArgumentException notAUri) {
            // keywords such as "inline" and "eval" are logged as they are
        }
        return scrub(value);
    }

    private static String path(String value) {
        try {
            return scrub(URI.create(value).getRawPath());
        } catch (IllegalArgumentException notAUri) {
            return "";
        }
    }

    private static String scrub(String value) {
        String clean = value.replaceAll("[\\p{Cntrl}]", "_");
        return clean.length() > MAX_FIELD ? clean.substring(0, MAX_FIELD) : clean;
    }
}
