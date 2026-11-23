package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.JoinListResult;
import de.tantive.groceries.ports.in.JoinListUseCase;
import de.tantive.groceries.ports.in.LookupInvitationUseCase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** The public invitation calls are limited per address, the join per address and, separately, per person (SPRING-SEC-21). */
@WebMvcTest(controllers = {InvitationController.class, JoinListController.class})
@SecuritySlice
@TestPropertySource(properties = {"app.rate-limits.invitations-per-minute=2", "app.rate-limits.join-per-minute=2"})
class SharingRateLimitTest {

    private static final String BODY = "{\"token\":\"" + ShareToken.generate().value() + "\"}";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    LookupInvitationUseCase lookup;

    @MockitoBean
    JoinListUseCase join;

    @Test
    void theThirdLookupFromOneAddressIsAnswered429WithRetryAfter() {
        when(lookup.lookupInvitation(any())).thenReturn(ListName.of("WG"));
        for (int i = 0; i < 2; i++) {
            assertThat(lookupFrom("203.0.113.1")).hasStatus(200);
        }

        var limited = lookupFrom("203.0.113.1");

        assertThat(limited).hasStatus(429);
        assertThat(limited.getResponse().getHeader("Retry-After")).isEqualTo("60");
        assertThat(limited)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("RATE_LIMITED"));
        assertThat(lookupFrom("203.0.113.2")).hasStatus(200); // another address is not affected
    }

    @Test
    void theThirdJoinOfOnePersonIsLimitedEvenFromChangingAddresses() {
        when(join.joinList(any())).thenReturn(new JoinListResult(UUID.randomUUID(), ListName.of("WG"), true));
        assertThat(joinAs("198.51.100.1", true)).hasStatus(200);
        assertThat(joinAs("198.51.100.2", true)).hasStatus(200);

        assertThat(joinAs("198.51.100.3", true)).hasStatus(429);
        assertThat(joinAs("198.51.100.3", false)).hasStatus(200); // the other person is not
    }

    private org.springframework.test.web.servlet.assertj.MvcTestResult lookupFrom(String address) {
        return mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(request -> {
                    request.setRemoteAddr(address);
                    return request;
                })
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();
    }

    private org.springframework.test.web.servlet.assertj.MvcTestResult joinAs(String address, boolean alice) {
        return mvc.post()
                .uri("/api/v1/memberships/join")
                .with(request -> {
                    request.setRemoteAddr(address);
                    return request;
                })
                .with(alice ? AppSessions.alice() : AppSessions.bob())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();
    }
}
