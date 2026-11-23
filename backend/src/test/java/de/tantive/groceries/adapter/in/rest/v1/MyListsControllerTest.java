package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.GetListQuery;
import de.tantive.groceries.ports.in.GetListUseCase;
import de.tantive.groceries.ports.in.ListMyListsQuery;
import de.tantive.groceries.ports.in.ListMyListsUseCase;
import de.tantive.groceries.support.People;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Web slice (TEST-ARCH-03, SPRING-SEC-10, SPRING-REST-13): the read endpoints of the lists. */
@WebMvcTest(controllers = MyListsController.class)
@SecuritySlice
@ExtendWith(OutputCaptureExtension.class)
class MyListsControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    ListMyListsUseCase listMyLists;

    @MockitoBean
    GetListUseCase getList;

    @Test
    void answers401WithoutASession() {
        var result = mvc.get().uri("/api/v1/lists").exchange();

        assertThat(result).hasStatus(401);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("UNAUTHENTICATED"));
    }

    @Test
    void listsTheLoggedInUsersListsInTheOrderOfTheUseCase() {
        when(listMyLists.listMyLists(any()))
                .thenReturn(List.of(
                        new ListSummary(LIST_ID, "Wocheneinkauf", 7, 12),
                        new ListSummary(UUID.fromString("22222222-2222-4222-8222-222222222222"), "WG-Vorrat", 0, 1)));

        var result = mvc.get().uri("/api/v1/lists").with(AppSessions.alice()).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().isStrictlyEqualTo("""
                        {"lists":[
                          {"id":"11111111-1111-4111-8111-111111111111","name":"Wocheneinkauf","openCount":7,"revision":12},
                          {"id":"22222222-2222-4222-8222-222222222222","name":"WG-Vorrat","openCount":0,"revision":1}]}""");
        verify(listMyLists).listMyLists(new ListMyListsQuery(People.alice()));
    }

    @Test
    void anEmptyAccountGetsAnEmptyArrayNotNull() {
        when(listMyLists.listMyLists(any())).thenReturn(List.of());

        var result = mvc.get().uri("/api/v1/lists").with(AppSessions.alice()).exchange();

        assertThat(result).bodyJson().isStrictlyEqualTo("{\"lists\":[]}");
    }

    @Test
    void returnsOneList() {
        when(getList.getList(any())).thenReturn(new ListSummary(LIST_ID, "Wocheneinkauf", 7, 12));

        var result = mvc.get()
                .uri("/api/v1/lists/" + LIST_ID)
                .with(AppSessions.alice())
                .exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .isStrictlyEqualTo(
                        "{\"id\":\"" + LIST_ID + "\",\"name\":\"Wocheneinkauf\",\"openCount\":7,\"revision\":12}");
        verify(getList).getList(new GetListQuery(People.alice(), LIST_ID));
    }

    @Test
    void answers404ProblemJsonForAListTheCallerMayNotSee(CapturedOutput output) {
        when(getList.getList(any())).thenThrow(new ListNotFoundException());

        var result = mvc.get()
                .uri("/api/v1/lists/" + LIST_ID)
                .with(AppSessions.bob())
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_NOT_FOUND"))
                .hasPathSatisfying(
                        "$.detail",
                        d -> d.assertThat().isEqualTo("Diese Liste gibt es nicht oder du hast keinen Zugriff."));
        // the refusal is an audit event with the pseudonymous id only (SPRING-SEC-22, SPRING-LOG-08)
        assertThat(output.getAll())
                .contains("access.refused", People.BOB_ID.toString())
                .doesNotContain(People.bob().email(), People.bob().displayName());
    }

    @Test
    void answers400ForAnIdThatIsNotAUuid() {
        var result = mvc.get()
                .uri("/api/v1/lists/not-a-uuid")
                .with(AppSessions.alice())
                .exchange();

        assertThat(result).hasStatus(400);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
    }
}
