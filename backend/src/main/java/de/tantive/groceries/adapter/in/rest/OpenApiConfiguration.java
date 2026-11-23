package de.tantive.groceries.adapter.in.rest;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Code-first OpenAPI contract of API version 1 (API-CON-02, SPRING-API-13). {@code servers} is fixed and the problem
 * details schema is declared so the committed spec does not depend on the test run.
 */
@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {

    static final String GROUP = "groceries-v1";

    @Bean
    OpenAPI groceriesOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Groceries list API").version("v1"))
                .servers(List.of(new Server().url("/")));
    }

    @Bean
    GroupedOpenApi groceriesV1() {
        return GroupedOpenApi.builder()
                .group(GROUP)
                .pathsToMatch("/api/v1/**")
                .addOpenApiCustomizer(problemDetailSchema())
                .build();
    }

    @SuppressWarnings("rawtypes")
    private static OpenApiCustomizer problemDetailSchema() {
        return openApi -> {
            Schema<?> problem = new ObjectSchema()
                    .description("RFC 9457 problem details; code is stable (API-REST-07)")
                    .addProperty("type", new StringSchema())
                    .addProperty("title", new StringSchema())
                    .addProperty("status", new IntegerSchema())
                    .addProperty("detail", new StringSchema())
                    .addProperty("instance", new StringSchema())
                    .addProperty("code", new StringSchema())
                    .addProperty("traceId", new StringSchema())
                    .addProperty("errors", new ArraySchema().items(new ObjectSchema()))
                    .addRequiredItem("status")
                    .addRequiredItem("code");
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            openApi.getComponents().addSchemas("ProblemDetail", problem);
        };
    }
}
