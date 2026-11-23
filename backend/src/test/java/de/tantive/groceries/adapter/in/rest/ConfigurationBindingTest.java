package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.unit.DataSize;

/** Binding and start-up rules of the SPA host and the request limits (TEST-CFG-01, REL-FE-06): no network, no context. */
class ConfigurationBindingTest {

    private final ApplicationContextRunner runner =
            new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class));

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(RequestLimitsProperties.class)
    static class Limits {}

    @Test
    void servesTheBundleByDefault() {
        runner.withUserConfiguration(FrontendConfiguration.class).run(context -> {
            assertThat(context.getBean(FrontendProperties.class).bundleEnabled())
                    .isTrue();
            assertThat(context).hasSingleBean(IndexHtml.class);
        });
    }

    @Test
    void bindsTheLimitWithItsUnit() {
        runner.withUserConfiguration(Limits.class)
                .withPropertyValues("app.limits.max-body-size=2KB")
                .run(context -> assertThat(
                                context.getBean(RequestLimitsProperties.class).maxBodySize())
                        .isEqualTo(DataSize.ofKilobytes(2)));
    }

    @Test
    void limitsToSixtyFourKilobytesByDefault() {
        runner.withUserConfiguration(Limits.class)
                .run(context -> assertThat(
                                context.getBean(RequestLimitsProperties.class).maxBodySize())
                        .isEqualTo(DataSize.ofKilobytes(64)));
    }

    @Test
    void failsToStartOnAnUnparsableLimit() {
        runner.withUserConfiguration(Limits.class)
                .withPropertyValues("app.limits.max-body-size=lots")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void refusesToStartWithoutTheBundle() {
        runner.withUserConfiguration(FrontendConfiguration.class)
                .withClassLoader(new FilteredClassLoader(new ClassPathResource("frontend/index.html")))
                .run(
                        context -> assertThat(context)
                                .hasFailed()
                                .getFailure()
                                .hasRootCauseMessage(
                                        "The frontend bundle is missing (classpath:/frontend/index.html). Build the image with"
                                                + " -Dfrontend.dist=<bundle> or set app.frontend.bundle-enabled=false for an API-only run."));
    }

    @Test
    void startsWithoutTheBundleWhenApiOnlyIsExplicit() {
        runner.withUserConfiguration(FrontendConfiguration.class)
                .withClassLoader(new FilteredClassLoader(new ClassPathResource("frontend/index.html")))
                .withPropertyValues("app.frontend.bundle-enabled=false")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(IndexHtml.class);
                });
    }
}
