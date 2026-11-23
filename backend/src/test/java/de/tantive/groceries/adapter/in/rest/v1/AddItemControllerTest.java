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

@WebMvcTest(controllers = AddItemController.class)
@SecuritySlice
class AddItemControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ITEM_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final Instant AT = Instant.parse("2026-11-23T10:00:00Z");
    private static final String ITEMS = "/api/v1/lists/" + LIST_ID + "/items";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    AddItemUseCase useCase;

    private MockMvcTester.MockMvcRequestBuilder post(String body) {
        return mvc.post().uri(ITEMS).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void answers401WithoutASessionAnd403WithoutCsrf() {
        assertThat(post("{\"text\":\"Milch\"}").with(csrf()).exchange()).hasStatus(401);
        assertThat(post("{\"text\":\"Milch\"}").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers201WithTheItemAndLocation() {
        when(useCase.addItem(any())).thenReturn(new Item(ITEM_ID, ItemText.of("Milch"), false, AT, 0));

        var result = post("{\"text\":\" Milch \"}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(201);
        assertThat(result.getResponse().getHeader("Location")).isEqualTo(ITEMS + "/" + ITEM_ID);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.text", t -> t.assertThat().isEqualTo("Milch"))
                .hasPathSatisfying("$.done", t -> t.assertThat().isEqualTo(false));
        verify(useCase).addItem(new AddItemCommand(People.bob(), LIST_ID, ItemText.of("Milch")));
    }

    @Test
    void ignoresAClientSuppliedId() {
        when(useCase.addItem(any())).thenReturn(new Item(ITEM_ID, ItemText.of("Milch"), false, AT, 0));

        var result = post("{\"id\":\"" + UUID.randomUUID() + "\",\"text\":\"Milch\"}")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(201);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.id", t -> t.assertThat().isEqualTo(ITEM_ID.toString()));
    }

    @Test
    void refusesAnEmptyAndAnOverlongTextWith400() {
        var empty =
                post("{\"text\":\"  \"}").with(AppSessions.alice()).with(csrf()).exchange();
        var tooLong = post("{\"text\":\"" + "a".repeat(201) + "\"}")
                .with(AppSessions.alice())
                .with(csrf())
                .exchange();

        assertThat(empty).hasStatus(400);
        assertThat(empty)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("VALIDATION_FAILED"))
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo("TEXT_REQUIRED"))
                .hasPathSatisfying("$.errors[0].field", c -> c.assertThat().isEqualTo("text"));
        assertThat(tooLong)
                .bodyJson()
                .hasPathSatisfying("$.errors[0].code", c -> c.assertThat().isEqualTo("TEXT_TOO_LONG"));
        verifyNoInteractions(useCase);
    }

    @Test
    void answers404ForANonMemberAnd409AtTheLimit() {
        org.mockito.Mockito.doThrow(new ListNotFoundException()).when(useCase).addItem(any());
        assertThat(post("{\"text\":\"X\"}").with(AppSessions.bob()).with(csrf()).exchange())
                .hasStatus(404);

        org.mockito.Mockito.doThrow(new ItemLimitReachedException())
                .when(useCase)
                .addItem(any());
        var full = post("{\"text\":\"X\"}").with(AppSessions.bob()).with(csrf()).exchange();
        assertThat(full).hasStatus(409);
        assertThat(full)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("ITEM_LIMIT_REACHED"));
    }
}
