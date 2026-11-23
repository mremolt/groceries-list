package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.support.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Exports the OpenAPI spec and fails if the committed file is stale (API-CON-03, SPRING-API-08). Refresh with
 * {@code ./mvnw verify -Dopenapi.update=true}.
 */
@SpringBootTest(
        properties = {"springdoc.api-docs.enabled=true", "springdoc.writer-with-order-by-keys=true"},
        webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiSpecIT {

    private static final Path SPEC = Path.of("openapi/groceries-v1.yaml");

    @Autowired
    MockMvcTester mvc;

    @Test
    void committedSpecMatchesTheCode() throws IOException {
        var result =
                mvc.get().uri("/v3/api-docs.yaml/" + OpenApiConfiguration.GROUP).exchange();

        assertThat(result).hasStatusOk();
        String generated = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        if (Boolean.getBoolean("openapi.update")) {
            Files.createDirectories(SPEC.getParent());
            Files.writeString(SPEC, generated, StandardCharsets.UTF_8);
        }
        assertThat(SPEC)
                .as("committed spec; refresh with -Dopenapi.update=true")
                .exists();
        assertThat(Files.readString(SPEC, StandardCharsets.UTF_8)).isEqualTo(generated);
    }
}
