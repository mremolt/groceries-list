package de.tantive.groceries.adapter.in.scheduling;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Switches on {@code @Scheduled} for the scheduling adapters and binds their settings. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(SchedulingConfiguration.AccountProperties.class)
class SchedulingConfiguration {

    /**
     * Settings of the account jobs.
     *
     * @param idpDeletionRetryDelay pause between two runs that finish account deletions at the identity provider
     */
    @ConfigurationProperties("app.account")
    record AccountProperties(@DefaultValue("PT5M") Duration idpDeletionRetryDelay) {}
}
