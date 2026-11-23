package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.People;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Items through the real security chain, use cases and PostgreSQL for two people: a stranger can neither read nor change
 * the items of another list, and every answer equals the one for an unknown list (BR-01, NFR-SEC-04, SPRING-SEC-16/36).
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Tag("cross-user")
class ItemsApiIT {

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

    /** The two people have fixed ids shared with other ITs (ListsApiIT asserts Bob has no lists): leave nothing behind. */
    @AfterEach
    void removeWhatTheTestCreated() {
        jdbc.sql("delete from lists where created_by in (?, ?)")
                .params(People.ALICE_ID, People.BOB_ID)
                .update();
        jdbc.sql("delete from memberships where user_id in (?, ?)")
                .params(People.ALICE_ID, People.BOB_ID)
                .update();
    }

    private UUID aliceList() {
        return Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
    }

    private MvcTestResult send(String method, String uri, RequestPostProcessor who, @Nullable String body) {
        var builder = switch (method) {
            case "GET" -> mvc.get().uri(uri);
            case "POST" -> mvc.post().uri(uri);
            case "PATCH" -> mvc.patch().uri(uri);
            default -> mvc.delete().uri(uri);
        };
        builder.with(who).with(csrf());
        if (body != null && !body.isEmpty()) {
            builder.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return builder.exchange();
    }

    @Test
    void aStrangerCannotReadAddChangeDeleteOrClearItemsOfAnotherUsersList() {
        UUID list = aliceList();
        UUID item = Arrange.item(jdbc, list, "Privat", true, Instant.now());
        String base = "/api/v1/lists/" + list + "/items";
        String unknownBase = "/api/v1/lists/" + UUID.randomUUID() + "/items";
        var bob = AppSessions.bob();

        String[][] calls = {
            {"GET", "", ""},
            {"POST", "", "{\"text\":\"Gehackt\"}"},
            {"PATCH", "/" + item, "{\"done\":false,\"text\":\"Gehackt\"}"},
            {"DELETE", "/" + item, ""},
            {"POST", "/clear-checked", "{\"itemIds\":[\"" + item + "\"]}"},
        };
        for (String[] call : calls) {
            MvcTestResult foreign = send(call[0], base + call[1], bob, call[2]);
            MvcTestResult unknown = send(call[0], unknownBase + call[1], bob, call[2]);
            assertThat(foreign).as(call[0] + " " + call[1]).hasStatus(404);
            assertThat(problemCore(foreign)).isEqualTo(problemCore(unknown));
        }

        // nothing changed for the owner
        var own = send("GET", base, AppSessions.alice(), null);
        assertThat(own).hasStatusOk();
        JsonNode items = body(own).get("items");
        assertThat(items).hasSize(1);
        assertThat(items.get(0).get("text").asString()).isEqualTo("Privat");
        assertThat(items.get(0).get("done").asBoolean()).isTrue();
    }

    @Test
    void membersAddCheckEditAndDeleteAndTheDrawerCountAndRevisionFollow() {
        UUID list = aliceList();
        Arrange.join(jdbc, People.BOB_ID, list, Instant.now());
        String base = "/api/v1/lists/" + list + "/items";

        var milk = send("POST", base, AppSessions.alice(), "{\"text\":\" Milch \"}");
        var bread = send("POST", base, AppSessions.bob(), "{\"text\":\"Brot\"}");
        assertThat(milk).hasStatus(201);
        String milkId = body(milk).get("id").asString();
        String breadId = body(bread).get("id").asString();

        var checked = send("PATCH", base + "/" + milkId, AppSessions.bob(), "{\"done\":true}");
        assertThat(checked).hasStatusOk();
        assertThat(body(checked).get("version").asLong()).isEqualTo(1);
        var renamed = send("PATCH", base + "/" + breadId, AppSessions.alice(), "{\"text\":\"Vollkornbrot\"}");
        assertThat(renamed).hasStatusOk();

        var all = body(send("GET", base, AppSessions.alice(), null)).get("items");
        assertThat(all.get(0).get("text").asString()).isEqualTo("Milch");
        assertThat(all.get(0).get("done").asBoolean()).isTrue();
        assertThat(all.get(1).get("text").asString()).isEqualTo("Vollkornbrot");

        var summary = body(send("GET", "/api/v1/lists/" + list, AppSessions.alice(), null));
        assertThat(summary.get("openCount").asInt()).isEqualTo(1);
        assertThat(summary.get("revision").asLong()).isEqualTo(4); // add, add, check, rename

        // clear: only the ids that are still checked; the bread was never checked
        var cleared = send(
                "POST",
                base + "/clear-checked",
                AppSessions.bob(),
                "{\"itemIds\":[\"" + milkId + "\",\"" + breadId + "\"]}");
        assertThat(body(cleared).get("removed").asInt()).isEqualTo(1);

        assertThat(send("DELETE", base + "/" + breadId, AppSessions.bob(), null))
                .hasStatus(204);
        assertThat(send("DELETE", base + "/" + breadId, AppSessions.bob(), null))
                .hasStatus(204); // already gone
        var gone = send("PATCH", base + "/" + breadId, AppSessions.bob(), "{\"done\":true}");
        assertThat(gone).hasStatus(404);
        assertThat(body(gone).get("code").asString()).isEqualTo("ITEM_NOT_FOUND");
    }

    @Test
    void theLastWriteWinsWithoutAnyVersionPrecondition() {
        UUID list = aliceList();
        Arrange.join(jdbc, People.BOB_ID, list, Instant.now());
        UUID item = Arrange.item(jdbc, list, "Milch", false, Instant.now());
        String uri = "/api/v1/lists/" + list + "/items/" + item;

        send("PATCH", uri, AppSessions.alice(), "{\"text\":\"Von Alice\"}");
        var second = send("PATCH", uri, AppSessions.bob(), "{\"text\":\"Von Bob\"}");

        assertThat(second).hasStatusOk();
        assertThat(body(second).get("text").asString()).isEqualTo("Von Bob");
    }

    @Test
    void anAnonymousCallIsRefusedWith401() {
        assertThat(mvc.get()
                        .uri("/api/v1/lists/" + UUID.randomUUID() + "/items")
                        .exchange())
                .hasStatus(401);
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(result.getResponse().getContentAsByteArray());
    }

    private static String problemCore(MvcTestResult result) {
        JsonNode problem = body(result);
        return problem.get("status") + "|" + problem.get("code") + "|" + problem.get("title") + "|"
                + problem.get("detail");
    }
}
