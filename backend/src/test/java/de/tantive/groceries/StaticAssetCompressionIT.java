package de.tantive.groceries;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.support.TestcontainersConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;

/**
 * The container compresses the hashed JavaScript and CSS of the bundle (NFR-PERF-01: the main bundle is about four times
 * smaller on the wire) and nothing else: HTML carries the CSP nonce and JSON the account data, and compressing secrets that
 * sit next to attacker-influenced text invites BREACH. Compression is a servlet-container feature, so the check needs a
 * real server (RANDOM_PORT), not MockMvc.
 */
@SpringBootTest(
        webEnvironment = WebEnvironment.RANDOM_PORT,
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test-only",
            "app.idp-admin.client-secret=test-only",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class StaticAssetCompressionIT {

    private final HttpClient client =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

    @Value("${local.server.port}")
    int port;

    private HttpResponse<byte[]> get(String path, String accept) throws IOException, InterruptedException {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .timeout(Duration.ofSeconds(5))
                .header("Accept-Encoding", "gzip")
                .header("Accept", accept)
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofByteArray());
    }

    @Test
    void compressesAHashedJavaScriptFile() throws Exception {
        var response = get("/chunk-BIG123.js", "*/*");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Encoding")).hasValue("gzip");
        assertThat(response.headers().allValues("Vary")).anyMatch(v -> v.equalsIgnoreCase("Accept-Encoding"));
    }

    @Test
    void doesNotCompressTheDocumentWithItsNonce() throws Exception {
        var response = get("/", "text/html");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Encoding")).isEmpty();
    }

    @Test
    void doesNotCompressJson() throws Exception {
        var response = get("/api/v1/me", "application/json");

        assertThat(response.headers().firstValue("Content-Encoding")).isEmpty();
    }
}
