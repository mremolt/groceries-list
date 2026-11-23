package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

/** A session past the absolute lifetime is ended even if it was used a second ago (SPRING-SEC-32, fixed clock). */
class AbsoluteSessionLifetimeFilterTest {

    private static final Instant CREATED = Instant.parse("2026-11-01T10:00:00Z");

    private static MockHttpSession sessionCreatedAt(Instant created) {
        return new MockHttpSession() {
            @Override
            public long getCreationTime() {
                return created.toEpochMilli();
            }
        };
    }

    private boolean invalidAfterRequestAt(Instant now) throws Exception {
        MockHttpSession session = sessionCreatedAt(CREATED);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(session);
        var filter = new AbsoluteSessionLifetimeFilter(Clock.fixed(now, ZoneOffset.UTC), Duration.ofDays(30));

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        return session.isInvalid();
    }

    @Test
    void keepsASessionInsideTheAbsoluteLifetime() throws Exception {
        assertThat(invalidAfterRequestAt(CREATED.plus(Duration.ofDays(29)))).isFalse();
    }

    @Test
    void endsASessionPastTheAbsoluteLifetime() throws Exception {
        assertThat(invalidAfterRequestAt(CREATED.plus(Duration.ofDays(31)))).isTrue();
    }

    @Test
    void ignoresARequestWithoutASession() throws Exception {
        var filter = new AbsoluteSessionLifetimeFilter(Clock.fixed(CREATED, ZoneOffset.UTC), Duration.ofDays(30));
        var chain = new MockFilterChain();

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }
}
