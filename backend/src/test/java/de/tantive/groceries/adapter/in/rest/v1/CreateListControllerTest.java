package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListLimitReachedException;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.CreateListCommand;
import de.tantive.groceries.ports.in.CreateListUseCase;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = CreateListController.class)
@SecuritySlice
class CreateListControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    CreateListUseCase createList;

    private MockMvcTester.MockMvcRequestBuilder post(String body) {
        return mvc.post()
                .uri("/api/v1/lists")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    @Test
    void answers401WithoutASession() {
        var result = post("{\"name\":\"X\"}").with(csrf()).exchange();

        assertThat(result).hasStatus(401);
        verifyNoInteractions(createList);
    }

    @Test
    void answers403WithoutACsrfToken() {
        var result = post("{\"name\":\"X\"}").with(AppSessions.alice()).exchange();

        assertThat(result).hasStatus(403);
        verifyNoInteractions(createList);
    }

    @Test
    void createsTheListAndAnswers201WithItsLocation() {
        when(createList.createList(any())).thenReturn(new ListSummary(LIST_ID, "Wocheneinkauf", 0, 0));

        var result = post("{\"name\":\"  Wocheneinkauf \"}")
                .with(AppSessions.alice())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(201);
        assertThat(result).headers().hasValue("Location", "/api/v1/lists/" + LIST_ID);
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo(
                        "{\"id\":\"" + LIST_ID + "\",\"name\":\"Wocheneinkauf\",\"openCount\":0,\"revision\":0}");
        verify(createList).createList(new CreateListCommand(People.alice(), ListName.of("Wocheneinkauf")));
    }

    @Test
    void refusesAMissingNameWith400AndTheFieldCode() {
        var result = post("{}").with(AppSessions.alice()).with(csrf()).exchange();

        assertValidation(result, "NAME_REQUIRED");
        verifyNoInteractions(createList);
    }

    @Test
    void refusesABlankNameWith400AndTheFieldCode() {
        assertValidation(
                post("{\"name\":\"   \"}")
                        .with(AppSessions.alice())
                        .with(csrf())
                        .exchange(),
                "NAME_REQUIRED");
    }

    @Test
    void refusesANameOver80CharactersWith400AndTheFieldCode() {
        var body = "{\"name\":\"" + "x".repeat(81) + "\"}";

        assertValidation(post(body).with(AppSessions.alice()).with(csrf()).exchange(), "NAME_TOO_LONG");
    }

    @Test
    void answers409WithTheLimitCodeAtTheHundredthList() {
        when(createList.createList(any())).thenThrow(new ListLimitReachedException());

        var result =
                post("{\"name\":\"X\"}").with(AppSessions.alice()).with(csrf()).exchange();

        assertThat(result).hasStatus(409);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_LIMIT_REACHED"))
                .hasPathSatisfying(
                        "$.detail",
                        d -> d.assertThat().isEqualTo("Du hast die maximale Anzahl von 100 Listen erreicht."));
    }

    private static void assertValidation(
            org.springframework.test.web.servlet.assertj.MvcTestResult result, String code) {
        assertThat(result).hasStatus(400);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("VALIDATION_FAILED"))
                .hasPathSatisfying("$.errors[0].field", f -> f.assertThat().isEqualTo("name"))
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo(code));
    }
}
