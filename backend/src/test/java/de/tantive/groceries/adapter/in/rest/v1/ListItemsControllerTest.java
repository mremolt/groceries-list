package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.*;
import de.tantive.groceries.ports.in.*;
import de.tantive.groceries.support.People;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = ListItemsController.class)
@SecuritySlice
class ListItemsControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ITEM_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final Instant AT = Instant.parse("2026-11-23T10:00:00Z");
    private static final String ITEMS = "/api/v1/lists/" + LIST_ID + "/items";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    ListItemsUseCase useCase;

    @Test
    void answers401WithoutASession() {
        assertThat(mvc.get().uri(ITEMS).exchange()).hasStatus(401);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers200WithTheItemsInOrder() {
        when(useCase.listItems(any())).thenReturn(List.of(new Item(ITEM_ID, ItemText.of("Milch"), true, AT, 2)));

        var result = mvc.get().uri(ITEMS).with(AppSessions.bob()).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo(
                        "{\"items\":[{\"id\":\"" + ITEM_ID
                                + "\",\"text\":\"Milch\",\"done\":true,\"createdAt\":\"2026-11-23T10:00:00Z\",\"version\":2}]}");
        verify(useCase).listItems(new ListItemsQuery(People.bob(), LIST_ID));
    }

    @Test
    void answers404ForANonMember() {
        when(useCase.listItems(any())).thenThrow(new ListNotFoundException());

        var result = mvc.get().uri(ITEMS).with(AppSessions.bob()).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_NOT_FOUND"));
    }
}
