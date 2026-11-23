package de.tantive.groceries.adapter.out.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import de.tantive.groceries.ports.out.PendingIdpDeletionPort;
import de.tantive.groceries.support.TestcontainersConfiguration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(
        properties = {
            "app.auth.issuer-uri=http://keycloak.localhost:8180/realms/groceries",
            "app.auth.client-secret=test",
            "app.idp-admin.client-secret=test",
            "app.sharing.public-base-url=http://localhost:8080"
        })
@Import(TestcontainersConfiguration.class)
class PendingIdpDeletionJdbcAdapterIT {

    private static final Instant NOW = Instant.parse("2000-01-01T10:00:00Z");

    @Autowired
    PendingIdpDeletionPort pending;

    @Test
    void recordsOnceListsOldestFirstWithinTheLimitAndForgets() {
        String older = "sub-" + UUID.randomUUID();
        String newer = "sub-" + UUID.randomUUID();

        pending.add(newer, NOW.plusSeconds(10));
        pending.add(older, NOW);
        pending.add(older, NOW.plusSeconds(99)); // recording twice is harmless and keeps the first time

        // the year 2000 puts both before any row of another test, which never writes old times
        assertThat(pending.oldest(2)).containsExactly(older, newer);
        assertThat(pending.oldest(1)).containsExactly(older);

        pending.remove(older);
        pending.remove(older);

        assertThat(pending.oldest(1)).containsExactly(newer);
    }
}
