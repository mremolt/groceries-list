package de.tantive.groceries.adapter.in.rest;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves the Angular bundle embedded at {@code classpath:/frontend/} (REL-FE-01/03, SPRING-REL-08/09). One resource
 * handler per URL pattern, each with its own location, so the {@code index.html} controller is never shadowed. A missing
 * file is a 404, never {@code index.html}. A deployed instance without the bundle refuses to start (REL-FE-06): set
 * {@code app.frontend.bundle-enabled=false} for an explicit API-only run.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(FrontendProperties.class)
class FrontendConfiguration {

    private static final String BUNDLE = "frontend/";

    @Bean
    @ConditionalOnProperty(name = "app.frontend.bundle-enabled", matchIfMissing = true)
    IndexHtml indexHtml() throws IOException {
        ClassPathResource index = new ClassPathResource(BUNDLE + "index.html");
        if (!index.exists()) {
            throw new IllegalStateException(
                    "The frontend bundle is missing (classpath:/frontend/index.html). Build the image with"
                            + " -Dfrontend.dist=<bundle> or set app.frontend.bundle-enabled=false for an API-only run.");
        }
        try (InputStream stream = index.getInputStream()) {
            return new IndexHtml(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
        }
    }

    @Bean
    @ConditionalOnProperty(name = "app.frontend.bundle-enabled", matchIfMissing = true)
    WebMvcConfigurer frontendResources() {
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                CacheControl hashed =
                        CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
                CacheControl unhashed =
                        CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic();
                registry.addResourceHandler("/*.js", "/*.css")
                        .addResourceLocations("classpath:/frontend/")
                        .setCacheControl(hashed);
                registry.addResourceHandler("/media/**")
                        .addResourceLocations("classpath:/frontend/media/")
                        .setCacheControl(hashed);
                registry.addResourceHandler("/icons/**")
                        .addResourceLocations("classpath:/frontend/icons/")
                        .setCacheControl(unhashed);
                registry.addResourceHandler("/favicon.ico")
                        .addResourceLocations("classpath:/frontend/")
                        .setCacheControl(unhashed);
                registry.addResourceHandler("/manifest.webmanifest")
                        .addResourceLocations("classpath:/frontend/")
                        .setCacheControl(unhashed);
            }
        };
    }
}
