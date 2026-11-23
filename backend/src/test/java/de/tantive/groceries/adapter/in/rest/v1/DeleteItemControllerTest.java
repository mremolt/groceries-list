package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.*;
import de.tantive.groceries.ports.in.*;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = DeleteItemController.class)
@SecuritySlice
class DeleteItemControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ITEM_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final String ITEMS = "/api/v1/lists/" + LIST_ID + "/items";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    DeleteItemUseCase useCase;

    private MockMvcTester.MockMvcRequestBuilder delete() {
        return mvc.delete().uri(ITEMS + "/" + ITEM_ID);
    }

    @Test
    void answers401WithoutASessionAnd403WithoutCsrf() {
        assertThat(delete().with(csrf()).exchange()).hasStatus(401);
        assertThat(delete().with(AppSessions.alice()).exchange()).hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void deletesAndAnswers204() {
        assertThat(delete().with(AppSessions.bob()).with(csrf()).exchange()).hasStatus(204);

        verify(useCase).deleteItem(new DeleteItemCommand(People.bob(), LIST_ID, ITEM_ID));
    }

    @Test
    void answers404ForANonMember() {
        org.mockito.Mockito.doThrow(new ListNotFoundException()).when(useCase).deleteItem(any());

        assertThat(delete().with(AppSessions.bob()).with(csrf()).exchange()).hasStatus(404);
    }
}
