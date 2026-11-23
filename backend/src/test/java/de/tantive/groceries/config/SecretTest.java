package de.tantive.groceries.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SecretTest {

    @Test
    void neverPrintsItsValue() {
        Secret secret = new Secret("s3cr3t-value");

        assertThat(secret.toString()).doesNotContain("s3cr3t-value");
        assertThat(secret.reveal()).isEqualTo("s3cr3t-value");
    }

    @Test
    void rejectsABlankValue() {
        assertThatThrownBy(() -> new Secret("  ")).isInstanceOf(IllegalArgumentException.class);
    }
}
