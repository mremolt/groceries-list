package de.tantive.groceries.adapter.in.rest;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * Token-bucket limit per client address for the paths it is registered for (SPRING-SEC-21). The client is the servlet
 * remote address, never an unvalidated {@code X-Forwarded-For} (the forwarded-header strategy is explicit, SPRING-SEC-12).
 * Answers 429 problem+json with code {@code RATE_LIMITED}; counts each rejection in the log without the address.
 */
final class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final String name;
    private final Predicate<String> appliesTo;
    private final int perMinute;
    private final Function<HttpServletRequest, @Nullable String> clientKey;
    private final JsonMapper mapper;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    RateLimitFilter(String name, Predicate<String> appliesTo, int perMinute, JsonMapper mapper) {
        this(name, appliesTo, perMinute, HttpServletRequest::getRemoteAddr, mapper);
    }

    /** {@code clientKey} says who is counted; a null key (nobody to count yet) lets the request pass. */
    RateLimitFilter(
            String name,
            Predicate<String> appliesTo,
            int perMinute,
            Function<HttpServletRequest, @Nullable String> clientKey,
            JsonMapper mapper) {
        this.name = name;
        this.appliesTo = appliesTo;
        this.perMinute = perMinute;
        this.clientKey = clientKey;
        this.mapper = mapper;
    }

    /** The logged-in person of this request, by the pseudonymous principal name; null without a login. */
    static @Nullable String person(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null
                        && authentication.isAuthenticated()
                        && !(authentication instanceof AnonymousAuthenticationToken)
                ? authentication.getName()
                : null;
    }

    /**
     * One marker per limit: {@link OncePerRequestFilter} marks a request as filtered per filter <em>class</em>, so a
     * second instance on the same request (per address and per person) would otherwise be skipped silently.
     */
    @Override
    protected String getAlreadyFilteredAttributeName() {
        return RateLimitFilter.class.getName() + "." + name + ".FILTERED";
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !appliesTo.test(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (buckets.size() > MAX_TRACKED_CLIENTS) {
            buckets.clear();
        }
        String client = clientKey.apply(request);
        if (client == null) {
            chain.doFilter(request, response);
            return;
        }
        Bucket bucket = buckets.computeIfAbsent(client, address -> newBucket());
        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }
        LOG.warn("Rate limit exceeded endpoint={}", name);
        response.setHeader("Retry-After", "60");
        ProblemJson.write(mapper, response, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Zu viele Anfragen");
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(perMinute).refillGreedy(perMinute, Duration.ofMinutes(1)))
                .build();
    }
}
