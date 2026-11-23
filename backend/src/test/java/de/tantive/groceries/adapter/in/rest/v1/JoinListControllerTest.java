package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.PendingInvitation;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.MemberLimitReachedException;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.JoinListCommand;
import de.tantive.groceries.ports.in.JoinListResult;
import de.tantive.groceries.ports.in.JoinListUseCase;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = JoinListController.class)
@SecuritySlice
class JoinListControllerTest {

    private static final String PATH = "/api/v1/memberships/join";
    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final ShareToken TOKEN = ShareToken.generate();

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    JoinListUseCase useCase;

    @Test
    void answers401WithoutASession() {
        assertThat(mvc.post().uri(PATH).with(csrf()).exchange()).hasStatus(401);
        verifyNoInteractions(useCase);
    }

    @Test
    void answers403WithoutACsrfToken() {
        assertThat(mvc.post().uri(PATH).with(AppSessions.bob()).exchange()).hasStatus(403);
        verifyNoInteractions(useCase);
    }

    @Test
    void joinsWithTheTokenOfTheBody() {
        when(useCase.joinList(any())).thenReturn(new JoinListResult(LIST_ID, ListName.of("WG"), false));

        var result = mvc.post()
                .uri(PATH)
                .with(AppSessions.bob())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + TOKEN.value() + "\"}")
                .exchange();

        assertThat(result).hasStatus(200);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.listId", v -> v.assertThat().isEqualTo(LIST_ID.toString()))
                .hasPathSatisfying("$.listName", v -> v.assertThat().isEqualTo("WG"))
                .hasPathSatisfying("$.alreadyMember", v -> v.assertThat().isEqualTo(false));
        verify(useCase).joinList(new JoinListCommand(People.bob(), TOKEN));
    }

    @Test
    void anEmptyBodyJoinsWithTheTokenFromTheSessionAndForgetsIt() {
        when(useCase.joinList(any())).thenReturn(new JoinListResult(LIST_ID, ListName.of("WG"), true));
        MockHttpSession session = new MockHttpSession();
        PendingInvitation.remember(session, TOKEN);

        var result = mvc.post()
                .uri(PATH)
                .session(session)
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(200);
        verify(useCase).joinList(new JoinListCommand(People.bob(), TOKEN));
        assertThat(PendingInvitation.peek(session)).isNull();
        assertThat(session.getMaxInactiveInterval()).isNotEqualTo(2 * 60 * 60);
    }

    @Test
    void theSessionTokenIsForgottenEvenWhenTheJoinFails() {
        doThrow(new ShareLinkInvalidException()).when(useCase).joinList(any());
        MockHttpSession session = new MockHttpSession();
        PendingInvitation.remember(session, TOKEN);

        var result = mvc.post()
                .uri(PATH)
                .session(session)
                .with(AppSessions.bob())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(404);
        assertThat(PendingInvitation.peek(session)).isNull();
    }

    @Test
    void noTokenAtAllIsAnInvalidLink() {
        var result = mvc.post().uri(PATH).with(AppSessions.bob()).with(csrf()).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("SHARE_LINK_INVALID"));
        verifyNoInteractions(useCase);
    }

    @Test
    void theMemberLimitIsA409WithItsGermanText() {
        doThrow(new MemberLimitReachedException()).when(useCase).joinList(any());

        var result = mvc.post()
                .uri(PATH)
                .with(AppSessions.bob())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + TOKEN.value() + "\"}")
                .exchange();

        assertThat(result).hasStatus(409);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("MEMBER_LIMIT_REACHED"))
                .hasPathSatisfying(
                        "$.detail",
                        d -> d.assertThat().isEqualTo("Diese Liste hat die maximale Anzahl an Mitgliedern erreicht."));
    }
}
