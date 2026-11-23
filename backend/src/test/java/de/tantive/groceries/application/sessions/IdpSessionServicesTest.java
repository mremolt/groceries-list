package de.tantive.groceries.application.sessions;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import de.tantive.groceries.ports.in.EndIdpSessionsCommand;
import de.tantive.groceries.ports.in.RegisterIdpSessionCommand;
import de.tantive.groceries.ports.out.IdpSessionPort;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** Sessions have no caller-supplied object id: provider-initiated calls (SPRING-SEC-40); listed in NO_CALLER_SUPPLIED_ID. */
class IdpSessionServicesTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    private final IdpSessionPort port = mock(IdpSessionPort.class);

    @Test
    void registersTheSessionAndPurgesRowsOlderThanTheAbsoluteLifetime() {
        var service = new RegisterIdpSessionService(port, Clock.fixed(NOW, ZoneOffset.UTC));

        service.register(new RegisterIdpSessionCommand("session-1", "sid-1", "sub-1"));

        verify(port).record("session-1", "sid-1", "sub-1", NOW);
        verify(port).purgeRecordedBefore(NOW.minus(Duration.ofDays(30)));
    }

    @Test
    void endsTheSessionsOfOneIdpSession() {
        var service = new EndIdpSessionsService(port);

        service.end(new EndIdpSessionsCommand("sub-1", "sid-1"));

        verify(port).endBySid("sid-1");
        verifyNoMoreInteractions(port);
    }

    @Test
    void endsAllSessionsOfTheSubjectWhenTheTokenCarriesNoSid() {
        var service = new EndIdpSessionsService(port);

        service.end(new EndIdpSessionsCommand("sub-1", ""));

        verify(port).endBySubject("sub-1");
        verifyNoMoreInteractions(port);
    }
}
