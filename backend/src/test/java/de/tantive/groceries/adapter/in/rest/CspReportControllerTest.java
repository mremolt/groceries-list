package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = CspReportController.class, properties = "app.limits.max-body-size=1KB")
@Import({SecurityConfiguration.class, I18nConfiguration.class, RestExceptionHandler.class})
@ExtendWith(OutputCaptureExtension.class)
class CspReportControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void acceptsAReportWithoutAXsrfTokenAndLogsItScrubbed(CapturedOutput output) {
        String report = """
                {"csp-report":{"effective-directive":"script-src-elem","blocked-uri":"https://evil.example/x.js?token=SECRET",
                 "document-uri":"https://app.example/j/SHARE-TOKEN?x=1#frag"}}""";

        var result = mvc.post()
                .uri("/csp-reports")
                .contentType("application/csp-report")
                .content(report)
                .exchange();

        assertThat(result).hasStatus(204);
        assertThat(output)
                .contains("script-src-elem")
                .contains("https://evil.example")
                .doesNotContain("SECRET")
                .doesNotContain("frag");
    }

    @Test
    void refusesAnOversizedBodyWithAProblem() {
        var result = mvc.post()
                .uri("/csp-reports")
                .contentType("application/csp-report")
                .content("x".repeat(2000))
                .exchange();

        assertThat(result).hasStatus(413);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("REQUEST_TOO_LARGE");
    }
}
