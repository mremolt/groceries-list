package de.tantive.groceries.adapter.in.rest;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Settings of the SPA host (SPRING-CFG-10). Public values only (CFG-11).
 *
 * @param bundleEnabled whether the backend serves the embedded Angular bundle from {@code classpath:/frontend/}. A
 *     deployed instance refuses to start without the bundle (REL-FE-06); {@code false} is the explicit API-only run
 *     (local development, where the frontend dev server proxies to the backend).
 *
 * @param environment environment name shown in frontend error reports, never in the UI
 * @param errorReportingEnabled whether the frontend sends error reports to the same-origin report path
 */
@ConfigurationProperties("app.frontend")
@Validated
record FrontendProperties(
        @DefaultValue("true") boolean bundleEnabled,
        @DefaultValue("local") String environment,
        @DefaultValue("false") boolean errorReportingEnabled) {}
