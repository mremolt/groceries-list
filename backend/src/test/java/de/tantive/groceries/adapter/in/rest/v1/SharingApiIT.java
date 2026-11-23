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
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
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
 * Sharing through the real security chain, use cases and PostgreSQL for three people: only members see or renew the
 * link, a renewed link is dead for everybody at once, a visitor learns the list name and nothing else, and the token
 * never reaches the log (BR-01, BR-06, NFR-SEC-04/05/09, FR-AUTH-06, SPRING-SEC-16/36).
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
@ExtendWith(OutputCaptureExtension.class)
@Tag("cross-user")
class SharingApiIT {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String BASE = "http://localhost:8080/j/";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void threePeopleHaveAnAccount() {
        Arrange.user(jdbc, People.ALICE_ID, "alice@example.test");
        Arrange.user(jdbc, People.BOB_ID, "bob@example.test");
        Arrange.user(jdbc, People.CAROL_ID, "carol@example.test");
    }

    /** The people have fixed ids shared with other ITs (ListsApiIT asserts Bob has no lists): leave nothing behind. */
    @AfterEach
    void removeWhatTheTestCreated() {
        jdbc.sql("delete from lists where created_by in (?, ?, ?)")
                .params(People.ALICE_ID, People.BOB_ID, People.CAROL_ID)
                .update();
        jdbc.sql("delete from memberships where user_id in (?, ?, ?)")
                .params(People.ALICE_ID, People.BOB_ID, People.CAROL_ID)
                .update();
    }

    @Test
    void aStrangerCannotSeeOrRenewTheLinkAndGetsTheAnswerForAnUnknownList() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "WG", Instant.now());
        String link = linkOf(get("/api/v1/lists/" + list + "/share-link", AppSessions.alice()));

        MvcTestResult unknown = get("/api/v1/lists/" + UUID.randomUUID() + "/share-link", AppSessions.bob());
        MvcTestResult read = get("/api/v1/lists/" + list + "/share-link", AppSessions.bob());
        MvcTestResult renew = post("/api/v1/lists/" + list + "/share-link/renew", AppSessions.bob(), null);

        assertThat(read).hasStatus(404);
        assertThat(problemCore(read)).isEqualTo(problemCore(unknown));
        assertThat(renew).hasStatus(404);
        assertThat(problemCore(renew)).isEqualTo(problemCore(unknown));
        assertThat(text(read)).doesNotContain(tokenOf(link));
        // nothing changed for the owner
        assertThat(linkOf(get("/api/v1/lists/" + list + "/share-link", AppSessions.alice())))
                .isEqualTo(link);
    }

    @Test
    void aMemberSeesTheSameLinkEveryTimeAndAnotherListGetsAnotherToken() {
        UUID first = Arrange.list(jdbc, People.ALICE_ID, "A", Instant.now());
        UUID second = Arrange.list(jdbc, People.ALICE_ID, "B", Instant.now());

        String link = linkOf(get("/api/v1/lists/" + first + "/share-link", AppSessions.alice()));

        assertThat(link).startsWith(BASE);
        assertThat(tokenOf(link)).hasSize(43);
        assertThat(linkOf(get("/api/v1/lists/" + first + "/share-link", AppSessions.alice())))
                .isEqualTo(link);
        assertThat(linkOf(get("/api/v1/lists/" + second + "/share-link", AppSessions.alice())))
                .isNotEqualTo(link);
    }

    @Test
    void joiningWorksOnceAndARenewalKillsTheOldLinkForEverybodyAtOnce(CapturedOutput output) {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "Wocheneinkauf", Instant.now());
        String oldToken = tokenOf(linkOf(get("/api/v1/lists/" + list + "/share-link", AppSessions.alice())));

        MvcTestResult joined = join(AppSessions.bob(), oldToken);
        assertThat(joined).hasStatusOk();
        assertThat(body(joined).get("listId").asString()).isEqualTo(list.toString());
        assertThat(body(joined).get("listName").asString()).isEqualTo("Wocheneinkauf");
        assertThat(body(joined).get("alreadyMember").asBoolean()).isFalse();
        assertThat(text(get("/api/v1/lists", AppSessions.bob()))).contains(list.toString());

        MvcTestResult again = join(AppSessions.bob(), oldToken);
        assertThat(body(again).get("alreadyMember").asBoolean()).isTrue();
        assertThat(count(list)).isEqualTo(2);

        String newToken = tokenOf(linkOf(post("/api/v1/lists/" + list + "/share-link/renew", AppSessions.bob(), null)));

        assertThat(newToken).isNotEqualTo(oldToken);
        MvcTestResult dead = join(AppSessions.carol(), oldToken);
        assertThat(dead).hasStatus(404);
        assertThat(body(dead).get("code").asString()).isEqualTo("SHARE_LINK_INVALID");
        assertThat(count(list)).isEqualTo(2); // memberships stay, nobody new came in
        assertThat(join(AppSessions.carol(), newToken)).hasStatusOk();
        assertThat(count(list)).isEqualTo(3);
        assertThat(output.getAll()).doesNotContain(oldToken).doesNotContain(newToken);
    }

    @Test
    void aVisitorLearnsTheListNameOnlyAndTheLoginJoinsWithTheRememberedToken(CapturedOutput output) {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "Grillabend", Instant.now());
        Arrange.item(jdbc, list, "Bratwurst", false, Instant.now());
        String token = tokenOf(linkOf(get("/api/v1/lists/" + list + "/share-link", AppSessions.alice())));

        MvcTestResult lookup = mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")
                .exchange();
        assertThat(lookup).hasStatusOk();
        assertThat(text(lookup)).isEqualTo("{\"listName\":\"Grillabend\"}");

        MvcTestResult remembered = mvc.post()
                .uri("/api/v1/invitations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")
                .exchange();
        assertThat(remembered).hasStatus(204);
        // the server-side session (Spring Session, JDBC) is what the cookie names; the token is nowhere else
        jakarta.servlet.http.Cookie sessionCookie = java.util.Arrays.stream(
                        remembered.getResponse().getCookies())
                .filter(cookie -> cookie.getName().contains("SESSION"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("the invitation call must open a server-side session"));
        // Cookie attributes (HttpOnly, Secure, SameSite) are not applied by MockMvc (no servlet container); the real
        // stack
        // asserts them in e2e/real/auth.spec.ts, and the visitor's session uses the same cookie configuration.

        // after the login the SPA calls join with an empty body; the session carries the token
        MvcTestResult consumed = mvc.post()
                .uri("/api/v1/memberships/join")
                .cookie(sessionCookie)
                .with(AppSessions.carol())
                .with(csrf())
                .exchange();

        assertThat(consumed).hasStatusOk();
        assertThat(body(consumed).get("listName").asString()).isEqualTo("Grillabend");
        // the token was used up: the same session joins nothing again
        MvcTestResult second = mvc.post()
                .uri("/api/v1/memberships/join")
                .cookie(sessionCookie)
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();
        assertThat(second).hasStatus(404);
        assertThat(count(list)).isEqualTo(2);
        assertThat(output.getAll()).doesNotContain(token);
    }

    @Test
    void everyWrongTokenGetsTheSameAnswerWhateverItLooksLike() {
        String unknown = tokenOf(BASE + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

        MvcTestResult aGuess = lookup(unknown);
        MvcTestResult garbage = lookup("../../etc/passwd");
        MvcTestResult empty = lookup("");
        MvcTestResult joinGuess = join(AppSessions.bob(), unknown);
        MvcTestResult joinNothing = post("/api/v1/memberships/join", AppSessions.bob(), null);

        for (MvcTestResult result : new MvcTestResult[] {aGuess, garbage, empty, joinGuess, joinNothing}) {
            assertThat(result).hasStatus(404);
            assertThat(body(result).get("code").asString()).isEqualTo("SHARE_LINK_INVALID");
            assertThat(body(result).get("detail").asString())
                    .isEqualTo("Bitte die Person, die dir den Link geschickt hat, um einen neuen.");
        }
        assertThat(problemCore(garbage)).isEqualTo(problemCore(aGuess));
        assertThat(problemCore(joinGuess)).isEqualTo(problemCore(aGuess));
    }

    @Test
    void theFiftyFirstPersonIsRefusedWithTheMemberLimitMessage() {
        UUID list = Arrange.list(jdbc, People.ALICE_ID, "Voll", Instant.now());
        for (int i = 0; i < 49; i++) {
            Arrange.join(jdbc, Arrange.user(jdbc), list, Instant.now());
        }
        String token = tokenOf(linkOf(get("/api/v1/lists/" + list + "/share-link", AppSessions.alice())));

        MvcTestResult refused = join(AppSessions.bob(), token);

        assertThat(refused).hasStatus(409);
        assertThat(body(refused).get("code").asString()).isEqualTo("MEMBER_LIMIT_REACHED");
        assertThat(body(refused).get("detail").asString())
                .isEqualTo("Diese Liste hat die maximale Anzahl an Mitgliedern erreicht.");
        assertThat(count(list)).isEqualTo(50);
        // a member of the full list opening the link again is no new member: no error
        assertThat(join(AppSessions.alice(), token)).hasStatusOk();
    }

    @Test
    void joinNeedsALogin() {
        MvcTestResult result = mvc.post()
                .uri("/api/v1/memberships/join")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .exchange();

        assertThat(result).hasStatus(401);
    }

    private MvcTestResult lookup(String token) {
        return mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")
                .exchange();
    }

    private MvcTestResult join(RequestPostProcessor person, String token) {
        return post("/api/v1/memberships/join", person, "{\"token\":\"" + token + "\"}");
    }

    private MvcTestResult get(String uri, RequestPostProcessor person) {
        return mvc.get().uri(uri).with(person).exchange();
    }

    private MvcTestResult post(String uri, RequestPostProcessor person, @Nullable String json) {
        var request = mvc.post().uri(uri).with(person).with(csrf());
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private long count(UUID list) {
        return jdbc.sql("select count(*) from memberships where list_id = ?")
                .param(list)
                .query(Long.class)
                .single();
    }

    private static String linkOf(MvcTestResult result) {
        assertThat(result).hasStatusOk();
        return body(result).get("url").asString();
    }

    private static String tokenOf(String link) {
        return link.substring(link.lastIndexOf('/') + 1);
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(text(result));
    }

    private static String problemCore(MvcTestResult result) {
        JsonNode problem = body(result);
        return problem.get("status") + "|" + problem.get("code") + "|" + problem.get("title") + "|"
                + problem.get("detail");
    }

    private static String text(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), java.nio.charset.StandardCharsets.UTF_8);
    }
}
