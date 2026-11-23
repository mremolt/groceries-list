package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.ports.in.LeaveListCommand;
import de.tantive.groceries.ports.in.LeaveListUseCase;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = LeaveListController.class)
@SecuritySlice
class LeaveListControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String PATH = "/api/v1/lists/" + LIST_ID + "/members/me";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    LeaveListUseCase useCase;

    @Test
    void answers401WithoutASession() {
        assertThat(mvc.delete().uri(PATH).with(csrf()).exchange()).hasStatus(401);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers403WithoutACsrfToken() {
        assertThat(mvc.delete().uri(PATH).with(AppSessions.alice()).exchange()).hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers204AndPassesTheCallerAndTheListId() {
        var result =
                mvc.delete().uri(PATH).with(AppSessions.alice()).with(csrf()).exchange();

        assertThat(result).hasStatus(204);
        verify(useCase).leaveList(new LeaveListCommand(People.alice(), LIST_ID));
    }

    @Test
    void answers404ProblemJsonForANonMember() {
        doThrow(new ListNotFoundException()).when(useCase).leaveList(any());

        var result = mvc.delete().uri(PATH).with(AppSessions.bob()).with(csrf()).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_NOT_FOUND"));
    }
}
