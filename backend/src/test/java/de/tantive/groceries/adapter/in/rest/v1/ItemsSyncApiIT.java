package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.support.Arrange;
import de.tantive.groceries.support.People;
import de.tantive.groceries.support.StatementCounting;
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
 * Synchronisation by polling through the real chain and PostgreSQL (ADR 0006, FR-SYNC-01..05, NFR-PERF-04): the ETag of
 * the item snapshot is the list revision, an unchanged list answers 304 without an item read, every list or item change
 * moves it, membership changes do not, and a list that is gone (or left) answers 404 even to a valid validator.
 */
@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, StatementCounting.class})
@Tag("cross-user")
class ItemsSyncApiIT {

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

    @AfterEach
    void removeWhatTheTestCreated() {
        jdbc.sql("delete from lists where created_by in (?, ?)")
                .params(People.ALICE_ID, People.BOB_ID)
                .update();
        jdbc.sql("delete from memberships where user_id in (?, ?)")
                .params(People.ALICE_ID, People.BOB_ID)
                .update();
    }

    private MvcTestResult send(
            String method, String uri, RequestPostProcessor who, @Nullable String body, @Nullable String ifNoneMatch) {
        var builder = switch (method) {
            case "GET" -> mvc.get().uri(uri);
            case "POST" -> mvc.post().uri(uri);
            case "PATCH" -> mvc.patch().uri(uri);
            default -> mvc.delete().uri(uri);
        };
        builder.with(who).with(csrf());
        if (ifNoneMatch != null) {
            builder.header("If-None-Match", ifNoneMatch);
        }
        if (body != null && !body.isEmpty()) {
            builder.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return builder.exchange();
    }

    private String etag(UUID list, RequestPostProcessor who) {
        MvcTestResult result = send("GET", items(list), who, null, null);
        assertThat(result).hasStatusOk();
        String etag = result.getResponse().getHeader("ETag");
        return java.util.Objects.requireNonNull(etag, "ETag header");
    }

    private static String items(UUID list) {
        return "/api/v1/lists/" + list + "/items";
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(result.getResponse().getContentAsByteArray());
    }

    @Test
    void anUnchangedListAnswers304WithTheETagAndWithoutReadingAnyItem() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
        Arrange.item(jdbc, list, "Milch", false, Instant.now());
        var alice = AppSessions.alice();

        StatementCounting.reset();
        MvcTestResult full = send("GET", items(list), alice, null, null);
        long statementsForTheSnapshot = StatementCounting.statements();
        String etag = full.getResponse().getHeader("ETag");
        assertThat(full).hasStatusOk();
        assertThat(body(full).get("items")).hasSize(1);

        StatementCounting.reset();
        MvcTestResult notModified = send("GET", items(list), alice, null, etag);
        long statementsForTheValidator = StatementCounting.statements();

        assertThat(notModified).hasStatus(304);
        assertThat(notModified.getResponse().getHeader("ETag")).isEqualTo(etag);
        assertThat(notModified.getResponse().getContentAsByteArray()).isEmpty();
        // the 304 path is the membership/revision read only: exactly the items statement less (API-N1-09,
        // SPRING-TEST-06)
        assertThat(statementsForTheValidator).isEqualTo(statementsForTheSnapshot - 1);
    }

    @Test
    void everyChangeOfTheListOrItsItemsMovesTheETagAndMembershipChangesDoNot() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
        var alice = AppSessions.alice();
        var bob = AppSessions.bob();
        String base = items(list);

        String seen = etag(list, alice);
        String[][] changes = {
            {"POST", base, "{\"text\":\"Milch\"}"},
            {"POST", base, "{\"text\":\"Brot\"}"},
        };
        for (String[] change : changes) {
            assertThat(send(change[0], change[1], alice, change[2], null)).hasStatus(201);
            seen = assertMoved(list, alice, seen, change[1]);
        }
        JsonNode all = body(send("GET", base, alice, null, null)).get("items");
        String milk = all.get(0).get("id").asString();
        String bread = all.get(1).get("id").asString();

        send("PATCH", base + "/" + milk, alice, "{\"done\":true}", null);
        seen = assertMoved(list, alice, seen, "check");
        send("PATCH", base + "/" + bread, alice, "{\"text\":\"Vollkornbrot\"}", null);
        seen = assertMoved(list, alice, seen, "edit text");
        send("POST", "/api/v1/lists/" + list + "/items/clear-checked", alice, "{\"itemIds\":[\"" + milk + "\"]}", null);
        seen = assertMoved(list, alice, seen, "clear checked");
        send("DELETE", base + "/" + bread, alice, null, null);
        seen = assertMoved(list, alice, seen, "delete");
        send("PATCH", "/api/v1/lists/" + list, alice, "{\"name\":\"Neu\"}", null);
        seen = assertMoved(list, alice, seen, "rename");

        // membership and link changes do not touch the items: the drawer poll carries them (ADR 0006)
        JsonNode link = body(send("GET", "/api/v1/lists/" + list + "/share-link", alice, null, null));
        String url = link.get("url").asString();
        String token = url.substring(url.lastIndexOf('/') + 1);
        assertThat(send("POST", "/api/v1/memberships/join", bob, "{\"token\":\"" + token + "\"}", null))
                .hasStatusOk();
        assertThat(etag(list, alice)).isEqualTo(seen);
        assertThat(send("POST", "/api/v1/lists/" + list + "/share-link/renew", alice, null, null))
                .hasStatusOk();
        assertThat(etag(list, alice)).isEqualTo(seen);
        assertThat(send("DELETE", "/api/v1/lists/" + list + "/members/me", bob, null, null))
                .hasStatus(204);
        assertThat(etag(list, alice)).isEqualTo(seen);
    }

    private String assertMoved(UUID list, RequestPostProcessor who, String before, String what) {
        String now = etag(list, who);
        assertThat(now).as("the ETag moves after: " + what).isNotEqualTo(before);
        assertThat(send("GET", items(list), who, null, before))
                .as("old validator after " + what)
                .hasStatusOk();
        assertThat(send("GET", items(list), who, null, now))
                .as("new validator after " + what)
                .hasStatus(304);
        return now;
    }

    @Test
    void aMemberWhoLeftOrAMemberOfADeletedListGets404EvenWithAValidValidator() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
        Arrange.join(jdbc, People.BOB_ID, list, Instant.now());
        String bobsEtag = etag(list, AppSessions.bob());
        assertThat(send("GET", items(list), AppSessions.bob(), null, bobsEtag)).hasStatus(304);

        assertThat(send("DELETE", "/api/v1/lists/" + list + "/members/me", AppSessions.bob(), null, null))
                .hasStatus(204);
        MvcTestResult left = send("GET", items(list), AppSessions.bob(), null, bobsEtag);
        assertThat(left).hasStatus(404);
        assertThat(left.getResponse().getHeader("ETag")).isNull();
        assertThat(body(left).get("code").asString()).isEqualTo("LIST_NOT_FOUND");

        // the same for a member of a list that someone else deleted (FR-SYNC-05)
        UUID other = Arrange.list(jdbc, People.ALICE_ID, "Grillen", Instant.now());
        Arrange.join(jdbc, People.BOB_ID, other, Instant.now());
        String etag = etag(other, AppSessions.bob());
        assertThat(send("DELETE", "/api/v1/lists/" + other, AppSessions.alice(), null, null))
                .hasStatus(204);
        MvcTestResult gone = send("GET", items(other), AppSessions.bob(), null, etag);
        assertThat(gone).hasStatus(404);
        assertThat(body(gone).get("code").asString()).isEqualTo("LIST_NOT_FOUND");
    }

    @Test
    void aStrangerWhoGuessesTheRevisionLearnsNothing() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "Privat", Instant.now());
        String etag = etag(list, AppSessions.alice());

        MvcTestResult foreign = send("GET", items(list), AppSessions.bob(), null, etag);
        MvcTestResult unknown = send("GET", items(UUID.randomUUID()), AppSessions.bob(), null, etag);

        assertThat(foreign).hasStatus(404);
        assertThat(unknown).hasStatus(404);
        assertThat(foreign.getResponse().getHeader("ETag")).isNull();
        assertThat(body(foreign).get("code")).isEqualTo(body(unknown).get("code"));
    }

    @Test
    void theDrawerSummaryCarriesTheRevisionThatTheItemETagCarries() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
        send("POST", items(list), AppSessions.alice(), "{\"text\":\"Milch\"}", null);

        long revision = body(send("GET", "/api/v1/lists", AppSessions.alice(), null, null))
                .get("lists")
                .get(0)
                .get("revision")
                .asLong();

        assertThat(etag(list, AppSessions.alice())).isEqualTo("\"" + revision + "\"");
    }
}
