package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.RenameListCommand;
import de.tantive.groceries.ports.in.RenameListUseCase;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = RenameListController.class)
@SecuritySlice
class RenameListControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String PATH = "/api/v1/lists/" + LIST_ID;

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    RenameListUseCase renameList;

    private MockMvcTester.MockMvcRequestBuilder patch(String body) {
        return mvc.patch().uri(PATH).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void answers401WithoutASession() {
        assertThat(patch("{\"name\":\"X\"}").with(csrf()).exchange()).hasStatus(401);
        verifyNoInteractions(renameList);
    }

    @Test
    void answers403WithoutACsrfToken() {
        assertThat(patch("{\"name\":\"X\"}").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(renameList);
    }

    @Test
    void renamesAndAnswers200WithTheListAndNoVersionPrecondition() {
        when(renameList.renameList(any())).thenReturn(new ListSummary(LIST_ID, "WG-Vorrat", 3, 5));

        var result = patch("{\"name\":\" WG-Vorrat \"}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo(
                        "{\"id\":\"" + LIST_ID + "\",\"name\":\"WG-Vorrat\",\"openCount\":3,\"revision\":5}");
        verify(renameList).renameList(new RenameListCommand(People.bob(), LIST_ID, ListName.of("WG-Vorrat")));
    }

    @Test
    void refusesAnEmptyNameWith400() {
        var result =
                patch("{\"name\":\"\"}").with(AppSessions.alice()).with(csrf()).exchange();

        assertThat(result).hasStatus(400);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("VALIDATION_FAILED"))
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo("NAME_REQUIRED"));
        verifyNoInteractions(renameList);
    }

    @Test
    void answers404ForANonMember() {
        when(renameList.renameList(any())).thenThrow(new ListNotFoundException());

        var result = patch("{\"name\":\"Mein\"}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_NOT_FOUND"));
    }
}
