package de.tantive.groceries.adapter.out.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import de.tantive.groceries.config.Secret;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/** Adapter test against a stub of Keycloak's token and admin endpoints (TEST-ARCH-03): protocol and timeouts. */
class KeycloakAdminAdapterTest {

    private HttpServer server;
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private final AtomicInteger userStatus = new AtomicInteger(204);
    private final AtomicInteger tokenStatus = new AtomicInteger(200);
    private volatile Duration userDelay = Duration.ZERO;

    @BeforeEach
    void startStub() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/realms/groceries/protocol/openid-connect/token", exchange -> {
            requests.add("POST " + exchange.getRequestURI().getRawPath() + " auth="
                    + exchange.getRequestHeaders().getFirst("Authorization") + " body="
                    + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            reply(exchange, tokenStatus.get(), "{\"access_token\":\"admin-token\",\"token_type\":\"Bearer\"}");
        });
        server.createContext("/admin/realms/groceries/users/", exchange -> {
            requests.add(
                    exchange.getRequestMethod() + " " + exchange.getRequestURI().getRawPath() + " auth="
                            + exchange.getRequestHeaders().getFirst("Authorization"));
            try {
                Thread.sleep(userDelay.toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            reply(exchange, userStatus.get(), "");
        });
        server.start();
    }

    @AfterEach
    void stopStub() {
        server.stop(0);
    }

    private static void reply(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, status == 204 ? -1 : bytes.length);
        if (status != 204) {
            exchange.getResponseBody().write(bytes);
        }
        exchange.close();
    }

    private KeycloakAdminAdapter adapter(Duration readTimeout) {
        String issuer = "http://localhost:" + server.getAddress().getPort() + "/realms/groceries";
        return new KeycloakAdminAdapter(
                new KeycloakAdminProperties(
                        issuer, "groceries-admin", new Secret("admin-secret"), Duration.ofSeconds(1), readTimeout),
                RestClient.builder());
    }

    @Test
    void logsInAsTheServiceAccountAndDeletesTheUserWithTheBearerToken() throws Exception {
        adapter(Duration.ofSeconds(2)).deleteUser("5d0b1a62-1111-4222-8333-444455556666");

        assertThat(requests).hasSize(2);
        assertThat(requests.get(0))
                .contains("grant_type=client_credentials")
                .contains("auth=Basic "); // client_secret_basic, the secret never in the body
        assertThat(requests.get(0)).doesNotContain("admin-secret");
        assertThat(requests.get(1))
                .isEqualTo("DELETE /admin/realms/groceries/users/5d0b1a62-1111-4222-8333-444455556666"
                        + " auth=Bearer admin-token");
    }

    @Test
    void aUserThatIsAlreadyGoneIsDeleted() {
        userStatus.set(404);

        assertThatCode(() -> adapter(Duration.ofSeconds(2)).deleteUser("gone")).doesNotThrowAnyException();
    }

    @Test
    void aSubjectCannotChangeThePathOfTheCall() throws Exception {
        adapter(Duration.ofSeconds(2)).deleteUser("../clients/x");

        assertThat(requests.get(1)).startsWith("DELETE /admin/realms/groceries/users/..%2Fclients%2Fx ");
    }

    @Test
    void anErrorAnswerIsAnOutageTheCallerCanRetry() {
        userStatus.set(500);

        assertThatThrownBy(() -> adapter(Duration.ofSeconds(2)).deleteUser("sub"))
                .isInstanceOf(IdentityProviderUnavailableException.class);
    }

    @Test
    void aRefusedAdminLoginIsAnOutageAndNothingIsDeleted() {
        tokenStatus.set(401);

        assertThatThrownBy(() -> adapter(Duration.ofSeconds(2)).deleteUser("sub"))
                .isInstanceOf(IdentityProviderUnavailableException.class);
        assertThat(requests).noneMatch(request -> request.startsWith("DELETE"));
    }

    @Test
    void aSlowIdentityProviderIsGivenUpAfterTheReadTimeout() {
        userDelay = Duration.ofSeconds(3);
        long start = System.nanoTime();

        assertThatThrownBy(() -> adapter(Duration.ofMillis(300)).deleteUser("sub"))
                .isInstanceOf(IdentityProviderUnavailableException.class);

        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
    }

    @Test
    void anIdentityProviderThatIsNotThereIsAnOutage() {
        KeycloakAdminAdapter adapter = adapter(Duration.ofSeconds(1));
        server.stop(0);

        assertThatThrownBy(() -> adapter.deleteUser("sub")).isInstanceOf(IdentityProviderUnavailableException.class);
    }

    @Test
    void refusesAnIssuerThatIsNotARealmUrl() {
        assertThatThrownBy(() -> new KeycloakAdminAdapter(
                        new KeycloakAdminProperties(
                                "http://localhost/other",
                                "groceries-admin",
                                new Secret("s"),
                                Duration.ofSeconds(1),
                                Duration.ofSeconds(1)),
                        RestClient.builder()))
                .isInstanceOf(IllegalStateException.class);
    }
}
