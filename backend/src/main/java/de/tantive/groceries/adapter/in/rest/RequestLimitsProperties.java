package de.tantive.groceries.adapter.in.rest;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

/**
 * Request limits (SPRING-SEC-15).
 *
 * @param maxBodySize largest accepted request body; larger requests get 413. Default 64 KB: the biggest legitimate
 *     body is one item or list name.
 */
@ConfigurationProperties("app.limits")
@Validated
record RequestLimitsProperties(
        @NotNull @DefaultValue("64KB") DataSize maxBodySize) {}
