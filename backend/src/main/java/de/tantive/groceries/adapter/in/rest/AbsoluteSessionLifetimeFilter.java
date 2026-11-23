package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A session older than the absolute lifetime is ended, however recently it was used (SPRING-SEC-32, ADR 0002): the
 * session store only knows the idle timeout. Time comes from the injected clock (ARCH-UC-20).
 */
final class AbsoluteSessionLifetimeFilter extends OncePerRequestFilter {

    private final Clock clock;
    private final Duration lifetime;

    AbsoluteSessionLifetimeFilter(Clock clock, Duration lifetime) {
        this.clock = clock;
        this.lifetime = lifetime;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null
                && Instant.ofEpochMilli(session.getCreationTime())
                        .plus(lifetime)
                        .isBefore(clock.instant())) {
            session.invalidate();
        }
        chain.doFilter(request, response);
    }
}
