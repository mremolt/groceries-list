package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.domain.AccessDeniedException;
import de.tantive.groceries.domain.BusinessRuleException;
import de.tantive.groceries.domain.ConflictException;
import de.tantive.groceries.domain.DomainValidationException;
import de.tantive.groceries.domain.NotFoundException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Every error category of ARCH-UC-13 reaches the client as problem+json with a stable code (SPRING-REST-13). */
@WebMvcTest(controllers = RestExceptionHandlerTest.FailingController.class)
@Import({
    SecurityConfiguration.class,
    I18nConfiguration.class,
    RestExceptionHandler.class,
    RestExceptionHandlerTest.FailingController.class
})
@Tag("problem-details")
class RestExceptionHandlerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void mapsAValidationErrorTo400WithTheFieldAndCode() {
        var result = mvc.get().uri("/api/v1/failing/validation").exchange();

        assertThat(result).hasStatus(400);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("NAME_EMPTY"))
                .hasPathSatisfying(
                        "$.errors[0].field", field -> field.assertThat().isEqualTo("name"));
    }

    @Test
    void mapsEachBusinessCategoryToItsStatus() {
        assertThat(mvc.get().uri("/api/v1/failing/not-found").exchange()).hasStatus(404);
        assertThat(mvc.get().uri("/api/v1/failing/conflict").exchange()).hasStatus(409);
        assertThat(mvc.get().uri("/api/v1/failing/rule").exchange()).hasStatus(422);
        assertThat(mvc.get().uri("/api/v1/failing/denied").exchange()).hasStatus(403);
    }

    @Test
    void answersGermanTitleAndLanguageForAKnownCode() {
        var result = mvc.get().uri("/api/v1/failing/not-found").exchange();

        assertThat(result).headers().hasValue("Content-Language", "de");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("NOT_FOUND"));
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.title", title -> title.assertThat().isEqualTo("Nicht gefunden"));
    }

    @Test
    void neverLeaksTheTextOfAnUnexpectedException() {
        var result = mvc.get().uri("/api/v1/failing/bug").exchange();

        assertThat(result).hasStatus(500);
        assertThat(result).bodyText().doesNotContain("secret internals");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("INTERNAL_ERROR"));
    }

    @Test
    void givesSpringsOwnErrorsAStableCode() {
        var result = mvc.post().uri("/api/v1/failing/validation").exchange();

        assertThat(result.getResponse().getStatus()).isIn(403, 405);
        var notFound = mvc.get().uri("/api/v1/nothing-here").exchange();
        assertThat(notFound).hasStatus(404);
        assertThat(notFound)
                .bodyJson()
                .hasPathSatisfying("$.code", code -> code.assertThat().isEqualTo("NOT_FOUND"));
    }

    @RestController
    static class FailingController {

        @GetMapping("/api/v1/failing/{kind}")
        String fail(@PathVariable String kind) {
            RuntimeException failure = switch (kind) {
                case "validation" -> new DomainValidationException("NAME_EMPTY", "name", "Bitte gib einen Namen ein.");
                case "not-found" -> new Missing();
                case "conflict" -> new Clash();
                case "rule" -> new Rule();
                case "denied" -> new Denied();
                default -> new IllegalStateException("secret internals");
            };
            throw failure;
        }
    }

    static class Missing extends NotFoundException {
        Missing() {
            super("NOT_FOUND", "not there");
        }
    }

    static class Clash extends ConflictException {
        Clash() {
            super("CLASH", "clash");
        }
    }

    static class Rule extends BusinessRuleException {
        Rule() {
            super("RULE", "rule");
        }
    }

    static class Denied extends AccessDeniedException {
        Denied() {
            super("ACCESS_DENIED", "no");
        }
    }
}
