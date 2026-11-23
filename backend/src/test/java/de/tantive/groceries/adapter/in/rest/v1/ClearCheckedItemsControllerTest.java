package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.*;
import de.tantive.groceries.ports.in.*;
import de.tantive.groceries.support.People;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = ClearCheckedItemsController.class)
@SecuritySlice
class ClearCheckedItemsControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ITEM_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final String ITEMS = "/api/v1/lists/" + LIST_ID + "/items";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    ClearCheckedItemsUseCase useCase;

    private MockMvcTester.MockMvcRequestBuilder post(String body) {
        return mvc.post()
                .uri(ITEMS + "/clear-checked")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    @Test
    void answers401WithoutASessionAnd403WithoutCsrf() {
        assertThat(post("{\"itemIds\":[]}").with(csrf()).exchange()).hasStatus(401);
        assertThat(post("{\"itemIds\":[]}").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers200WithTheNumberRemoved() {
        when(useCase.clearCheckedItems(any())).thenReturn(2);

        var result = post("{\"itemIds\":[\"" + ITEM_ID + "\"]}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().isStrictlyEqualTo("{\"removed\":2}");
        verify(useCase).clearCheckedItems(new ClearCheckedItemsCommand(People.bob(), LIST_ID, Set.of(ITEM_ID)));
    }

    @Test
    void refusesMoreThanFiveHundredIdsWith400() {
        StringBuilder distinct = new StringBuilder();
        for (int i = 0; i < 501; i++) {
            distinct.append(i == 0 ? "" : ",")
                    .append('"')
                    .append(UUID.randomUUID())
                    .append('"');
        }

        var result = post("{\"itemIds\":[" + distinct + "]}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(400);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers404ForANonMember() {
        when(useCase.clearCheckedItems(any())).thenThrow(new ListNotFoundException());

        assertThat(post("{\"itemIds\":[]}").with(AppSessions.bob()).with(csrf()).exchange())
                .hasStatus(404);
    }
}
