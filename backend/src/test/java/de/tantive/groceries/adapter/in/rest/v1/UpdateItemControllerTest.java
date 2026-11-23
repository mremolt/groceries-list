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
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = UpdateItemController.class)
@SecuritySlice
class UpdateItemControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ITEM_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final Instant AT = Instant.parse("2026-11-23T10:00:00Z");
    private static final String ITEMS = "/api/v1/lists/" + LIST_ID + "/items";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    UpdateItemUseCase useCase;

    private MockMvcTester.MockMvcRequestBuilder patch(String body) {
        return mvc.patch()
                .uri(ITEMS + "/" + ITEM_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    @Test
    void answers401WithoutASessionAnd403WithoutCsrf() {
        assertThat(patch("{\"done\":true}").with(csrf()).exchange()).hasStatus(401);
        assertThat(patch("{\"done\":true}").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void checksAnItemAndAnswers200WithTheItemAndNoVersionPrecondition() {
        when(useCase.updateItem(any())).thenReturn(new Item(ITEM_ID, ItemText.of("Milch"), true, AT, 3));

        var result =
                patch("{\"done\":true}").with(AppSessions.bob()).with(csrf()).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.done", t -> t.assertThat().isEqualTo(true))
                .hasPathSatisfying("$.version", t -> t.assertThat().isEqualTo(3));
        verify(useCase).updateItem(new UpdateItemCommand(People.bob(), LIST_ID, ITEM_ID, null, true));
    }

    @Test
    void editsTheText() {
        when(useCase.updateItem(any())).thenReturn(new Item(ITEM_ID, ItemText.of("Hafermilch"), false, AT, 1));

        var result = patch("{\"text\":\" Hafermilch \"}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatusOk();
        verify(useCase)
                .updateItem(new UpdateItemCommand(People.bob(), LIST_ID, ITEM_ID, ItemText.of("Hafermilch"), null));
    }

    @Test
    void refusesAnEmptyBodyAndABadTextWith400() {
        assertThat(patch("{}").with(AppSessions.alice()).with(csrf()).exchange())
                .hasStatus(400);
        assertThat(patch("{\"text\":\"\"}")
                        .with(AppSessions.alice())
                        .with(csrf())
                        .exchange())
                .hasStatus(400);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers404ForAGoneItemAndForANonMember() {
        org.mockito.Mockito.doThrow(new ItemNotFoundException()).when(useCase).updateItem(any());
        var gone = patch("{\"done\":true}").with(AppSessions.bob()).with(csrf()).exchange();
        assertThat(gone).hasStatus(404);
        assertThat(gone)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("ITEM_NOT_FOUND"));

        org.mockito.Mockito.doThrow(new ListNotFoundException()).when(useCase).updateItem(any());
        assertThat(patch("{\"done\":true}").with(AppSessions.bob()).with(csrf()).exchange())
                .hasStatus(404);
    }
}
