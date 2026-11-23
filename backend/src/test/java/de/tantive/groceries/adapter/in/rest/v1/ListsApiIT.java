package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.People;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The whole path through the real security chain, use cases and PostgreSQL for two people: user B cannot read or change
 * user A's list, and a stranger's request is indistinguishable from one for an unknown id (BR-01, NFR-SEC-04,
 * SPRING-SEC-16/36).
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test"
        })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Tag("cross-user")
class ListsApiIT {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void bothPeopleHaveAnAccount() {
        Arrange.user(jdbc, People.ALICE_ID, "alice@example.test");
        Arrange.user(jdbc, People.BOB_ID, "bob@example.test");
    }

    @Test
    void aStrangerCannotReadRenameDeleteOrLeaveAnotherUsersList() {
        String listId = createAsAlice("Wocheneinkauf");

        // a stranger gets the same answer as for an id that never existed
        MvcTestResult unknown = mvc.get()
                .uri("/api/v1/lists/" + UUID.randomUUID())
                .with(AppSessions.bob())
                .exchange();
        MvcTestResult read =
                mvc.get().uri("/api/v1/lists/" + listId).with(AppSessions.bob()).exchange();
        assertThat(read).hasStatus(404);
        assertThat(problemCore(read)).isEqualTo(problemCore(unknown));

        var rename = mvc.patch()
                .uri("/api/v1/lists/" + listId)
                .with(AppSessions.bob())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gehackt\"}")
                .exchange();
        var delete = mvc.delete()
                .uri("/api/v1/lists/" + listId)
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();
        var leave = mvc.delete()
                .uri("/api/v1/lists/" + listId + "/members/me")
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();
        assertThat(rename).hasStatus(404);
        assertThat(delete).hasStatus(404);
        assertThat(leave).hasStatus(404);
        assertThat(problemCore(rename)).isEqualTo(problemCore(unknown));
        assertThat(problemCore(delete)).isEqualTo(problemCore(unknown));
        assertThat(problemCore(leave)).isEqualTo(problemCore(unknown));

        // nothing changed for the owner, and the stranger's overview stays empty
        var own = mvc.get()
                .uri("/api/v1/lists/" + listId)
                .with(AppSessions.alice())
                .exchange();
        assertThat(own).hasStatusOk();
        assertThat(own)
                .bodyJson()
                .hasPathSatisfying("$.name", n -> n.assertThat().isEqualTo("Wocheneinkauf"));
        var bobsLists = mvc.get().uri("/api/v1/lists").with(AppSessions.bob()).exchange();
        assertThat(bobsLists).bodyJson().isStrictlyEqualTo("{\"lists\":[]}");
    }

    @Test
    void aMemberRenamesLeavesAndTheLastMemberLeavingDeletesTheList() {
        String listId = createAsAlice("WG");
        Arrange.join(jdbc, People.BOB_ID, UUID.fromString(listId), java.time.Instant.now());

        var renamed = mvc.patch()
                .uri("/api/v1/lists/" + listId)
                .with(AppSessions.bob())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"WG-Vorrat\"}")
                .exchange();
        assertThat(renamed).hasStatusOk();
        assertThat(renamed)
                .bodyJson()
                .hasPathSatisfying("$.revision", r -> r.assertThat().isEqualTo(1));

        var aliceSees = mvc.get()
                .uri("/api/v1/lists/" + listId)
                .with(AppSessions.alice())
                .exchange();
        assertThat(aliceSees)
                .bodyJson()
                .hasPathSatisfying("$.name", n -> n.assertThat().isEqualTo("WG-Vorrat"));

        assertThat(leave(listId, AppSessions.bob())).hasStatus(204);
        assertThat(mvc.get()
                        .uri("/api/v1/lists/" + listId)
                        .with(AppSessions.alice())
                        .exchange())
                .hasStatusOk(); // the list stays while a member remains
        assertThat(leave(listId, AppSessions.alice())).hasStatus(204);
        assertThat(mvc.get()
                        .uri("/api/v1/lists/" + listId)
                        .with(AppSessions.alice())
                        .exchange())
                .hasStatus(404); // BR-04: the last member leaving deleted it
        assertThat(jdbc.sql("select count(*) from lists where id = ?")
                        .param(UUID.fromString(listId))
                        .query(Long.class)
                        .single())
                .isZero();
    }

    @Test
    void anyMemberDeletesTheListForEveryone() {
        String listId = createAsAlice("Grillabend Samstag");
        Arrange.join(jdbc, People.BOB_ID, UUID.fromString(listId), java.time.Instant.now());

        assertThat(mvc.delete()
                        .uri("/api/v1/lists/" + listId)
                        .with(AppSessions.bob())
                        .with(csrf())
                        .exchange())
                .hasStatus(204);

        assertThat(mvc.get()
                        .uri("/api/v1/lists/" + listId)
                        .with(AppSessions.alice())
                        .exchange())
                .hasStatus(404);
    }

    @Test
    void theOverviewListsOnlyTheCallersListsOldestMembershipFirst() {
        String first = createAsAlice("Zuerst");
        String second = createAsAlice("Danach");

        var result = mvc.get().uri("/api/v1/lists").with(AppSessions.alice()).exchange();

        assertThat(result).hasStatusOk();
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying(
                        "$.lists[?(@.id=='" + first + "')].name",
                        n -> n.assertThat().isNotNull())
                .hasPathSatisfying(
                        "$.lists[?(@.id=='" + second + "')].name",
                        n -> n.assertThat().isNotNull());
        assertThat(positionOf(result, first)).isLessThan(positionOf(result, second));
    }

    private MvcTestResult leave(String listId, org.springframework.test.web.servlet.request.RequestPostProcessor who) {
        return mvc.delete()
                .uri("/api/v1/lists/" + listId + "/members/me")
                .with(who)
                .with(csrf())
                .exchange();
    }

    private String createAsAlice(String name) {
        var created = mvc.post()
                .uri("/api/v1/lists")
                .with(AppSessions.alice())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\"}")
                .exchange();
        assertThat(created).hasStatus(201);
        return body(created).get("id").asString();
    }

    private static int positionOf(MvcTestResult overview, String id) {
        JsonNode lists = body(overview).get("lists");
        for (int i = 0; i < lists.size(); i++) {
            if (id.equals(lists.get(i).get("id").asString())) {
                return i;
            }
        }
        throw new AssertionError("list " + id + " not in the overview");
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(result.getResponse().getContentAsByteArray());
    }

    /** Status, code, title and detail: everything except the request path in {@code instance}. */
    private static String problemCore(MvcTestResult result) {
        JsonNode problem = body(result);
        return problem.get("status") + "|" + problem.get("code") + "|" + problem.get("title") + "|"
                + problem.get("detail");
    }
}
