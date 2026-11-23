package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.PendingInvitation;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.LookupInvitationQuery;
import de.tantive.groceries.ports.in.LookupInvitationUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** The only public API: no session needed, the token only in the body, a wrong one is the uniform 404. */
@WebMvcTest(controllers = InvitationController.class)
@SecuritySlice
class InvitationControllerTest {

    private static final ShareToken TOKEN = ShareToken.generate();
    private static final String BODY = "{\"token\":\"" + TOKEN.value() + "\"}";

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    LookupInvitationUseCase lookup;

    @Test
    void lookupNeedsNoSessionAndAnswersWithTheListNameOnly() throws Exception {
        when(lookup.lookupInvitation(any())).thenReturn(ListName.of("Wocheneinkauf"));

        var result = mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();

        assertThat(result).hasStatus(200);
        assertThat(result.getResponse().getContentAsString()).isEqualTo("{\"listName\":\"Wocheneinkauf\"}");
        verify(lookup).lookupInvitation(new LookupInvitationQuery(TOKEN));
    }

    @Test
    void anInvalidLinkIsTheUniform404WithoutALookup() {
        var result = mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"nonsense\"}")
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("SHARE_LINK_INVALID"));
        verifyNoInteractions(lookup);
    }

    @Test
    void anUnknownTokenGetsTheSameAnswer() throws Exception {
        doThrow(new ShareLinkInvalidException()).when(lookup).lookupInvitation(any());

        var result = mvc.post()
                .uri("/api/v1/invitations/lookup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result.getResponse().getContentAsString()).doesNotContain(TOKEN.value());
    }

    @Test
    void lookupWithoutACsrfTokenIsRefused() {
        var result = mvc.post()
                .uri("/api/v1/invitations/lookup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();

        assertThat(result).hasStatus(403);
        verifyNoInteractions(lookup);
    }

    @Test
    void rememberingStoresTheTokenInTheServerSideSessionAndAnswers204() throws Exception {
        MockHttpSession session = new MockHttpSession();

        var result = mvc.post()
                .uri("/api/v1/invitations")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();

        assertThat(result).hasStatus(204);
        assertThat(result.getResponse().getContentAsString()).isEmpty();
        assertThat(PendingInvitation.peek(session)).isEqualTo(TOKEN.value());
        assertThat(session.getMaxInactiveInterval()).isEqualTo(2 * 60 * 60);
    }

    @Test
    void aWrongTokenCreatesNoSession() {
        doThrow(new ShareLinkInvalidException()).when(lookup).lookupInvitation(any());

        var result = mvc.post()
                .uri("/api/v1/invitations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY)
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getRequest().getSession(false)).isNull();
    }
}
