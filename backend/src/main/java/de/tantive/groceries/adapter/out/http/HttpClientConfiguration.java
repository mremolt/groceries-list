package de.tantive.groceries.adapter.out.http;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Binds the properties of the outgoing HTTP clients of this package. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(KeycloakAdminProperties.class)
class HttpClientConfiguration {}
