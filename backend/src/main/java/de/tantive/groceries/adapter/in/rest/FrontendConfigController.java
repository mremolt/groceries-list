package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.stereotype.WebAdapter;
import org.springframework.core.env.Environment;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Runtime configuration of the SPA: one build serves every environment (CFG-11, SPRING-CFG-10). Public values only;
 * never a dump of the environment. A public path ("public bootstrap data"), never cached.
 */
@WebAdapter
@RestController
class FrontendConfigController {

    private final Environment environment;
    private final FrontendProperties properties;

    FrontendConfigController(Environment environment, FrontendProperties properties) {
        this.environment = environment;
        this.properties = properties;
    }

    @GetMapping(path = "/config.json", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<FrontendConfigResponse> config() {
        String release = environment.getProperty("info.release.version", "unreleased");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new FrontendConfigResponse(
                        release,
                        properties.environment(),
                        "/api",
                        new ErrorReporting(properties.errorReportingEnabled(), "/api/v1/client-errors")));
    }

    /** The release version the frontend attaches to error reports and uses for the chunk-reload guard (REL-VER-05). */
    record FrontendConfigResponse(
            String releaseVersion, String environment, String apiBaseUrl, ErrorReporting errorReporting) {}

    record ErrorReporting(boolean enabled, String path) {}
}
