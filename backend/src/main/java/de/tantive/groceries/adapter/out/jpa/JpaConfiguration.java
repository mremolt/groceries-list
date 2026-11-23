package de.tantive.groceries.adapter.out.jpa;

import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** Feature annotations live on the adapter's own configuration (SPRING-ARCH-05). */
@Configuration(proxyBeanMethods = false)
@EnableJpaRepositories(basePackageClasses = UserRepository.class)
@EntityScan(basePackageClasses = UserEntity.class)
class JpaConfiguration {}
