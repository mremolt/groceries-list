package de.tantive.groceries.adapter.in.rest;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.restclient.autoconfigure.RestClientAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/**
 * What every web slice test of the REST adapter needs besides the controller: the real security filter chains, the OIDC
 * client configuration (no network: built from properties) and test doubles for the use cases the login calls.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@ImportAutoConfiguration(RestClientAutoConfiguration.class)
@Import({
    SecurityConfiguration.class,
    AuthConfiguration.class,
    I18nConfiguration.class,
    RestExceptionHandler.class,
    SecuritySliceBeans.class
})
@TestPropertySource(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test-only"
        })
public @interface SecuritySlice {}
