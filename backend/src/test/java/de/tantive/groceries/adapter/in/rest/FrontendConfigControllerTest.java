package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** {@code /config.json} is public bootstrap data: anonymous, exact keys, never cached (SPRING-CFG-10). */
@WebMvcTest(controllers = FrontendConfigController.class, properties = "info.release.version=1.2.3")
@SecuritySlice
@Import(FrontendConfiguration.class)
class FrontendConfigControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void servesThePublicConfigurationWithoutAuthenticationAndWithoutCaching() {
        var result = mvc.get().uri("/config.json").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).headers().hasValue("Cache-Control", "no-store");
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo(
                        "{\"releaseVersion\":\"1.2.3\",\"environment\":\"local\",\"apiBaseUrl\":\"/api\",\"errorReporting\":{\"enabled\":false,\"path\":\"/api/v1/client-errors\"}}");
    }
}
