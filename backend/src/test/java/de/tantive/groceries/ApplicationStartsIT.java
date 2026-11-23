package de.tantive.groceries;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.support.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.util.ClassUtils;

/**
 * The deployed defaults start (TEST-CFG-02: no {@code local} profile, only the keys of the key list) and the probes
 * answer on the main port without a session (SPRING-OBS-01/02, OBS-05).
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test-only"
        })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ApplicationStartsIT {

    @Autowired
    MockMvcTester mvc;

    @Test
    void answersTheLivenessProbeOnTheMainPort() {
        assertThat(mvc.get().uri("/livez").exchange()).hasStatusOk();
    }

    @Test
    void answersTheReadinessProbeOnTheMainPort() {
        assertThat(mvc.get().uri("/readyz").exchange()).hasStatusOk();
    }

    @Test
    void servesTheEmbeddedBundleAtTheRoot() {
        assertThat(mvc.get().uri("/").accept(MediaType.TEXT_HTML).exchange())
                .hasStatusOk()
                .bodyText()
                .contains("<app-root");
    }

    @Test
    void keepsTheOpenApiEndpointOffWhenDeployed() {
        assertThat(mvc.get().uri("/v3/api-docs").exchange()).hasStatus(404);
        assertThat(ClassUtils.isPresent("org.h2.Driver", getClass().getClassLoader()))
                .isFalse();
        assertThat(mvc.get()
                        .uri("/swagger-ui.html")
                        .accept(MediaType.APPLICATION_JSON)
                        .exchange())
                .hasStatus4xxClientError();
    }
}
