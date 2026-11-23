package de.tantive.groceries.adapter.in.rest.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import de.tantive.groceries.adapter.in.rest.AppSessions;
import de.tantive.groceries.adapter.in.rest.SecuritySlice;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.GetShareLinkQuery;
import de.tantive.groceries.ports.in.GetShareLinkUseCase;
import de.tantive.groceries.ports.in.RenewShareLinkCommand;
import de.tantive.groceries.ports.in.RenewShareLinkUseCase;
import de.tantive.groceries.support.People;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(controllers = ShareLinkController.class)
@SecuritySlice
class ShareLinkControllerTest {

    private static final UUID LIST_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String PATH = "/api/v1/lists/" + LIST_ID + "/share-link";
    private static final ShareToken TOKEN = ShareToken.generate();

    @Autowired
    MockMvcTester mvc;

    @MockitoBean
    GetShareLinkUseCase get;

    @MockitoBean
    RenewShareLinkUseCase renew;

    @Test
    void answers401WithoutASession() {
        assertThat(mvc.get().uri(PATH).exchange()).hasStatus(401);
        assertThat(mvc.post().uri(PATH + "/renew").with(csrf()).exchange()).hasStatus(401);
        verifyNoInteractions(get, renew);
    }

    @Test
    void renewalAnswers403WithoutACsrfToken() {
        assertThat(mvc.post().uri(PATH + "/renew").with(AppSessions.alice()).exchange())
                .hasStatus(403);
        verifyNoInteractions(renew);
    }

    @Test
    void theLinkIsThePublicOriginWithTheTokenAsPath() {
        when(get.getShareLink(any())).thenReturn(TOKEN);

        var result = mvc.get().uri(PATH).with(AppSessions.alice()).exchange();

        assertThat(result).hasStatus(200);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying(
                        "$.url", url -> url.assertThat().isEqualTo("http://localhost:8080/j/" + TOKEN.value()));
        verify(get).getShareLink(new GetShareLinkQuery(People.alice(), LIST_ID));
    }

    @Test
    void renewingAnswersWithTheNewLink() {
        when(renew.renewShareLink(any())).thenReturn(TOKEN);

        var result = mvc.post()
                .uri(PATH + "/renew")
                .with(AppSessions.alice())
                .with(csrf())
                .exchange();

        assertThat(result).hasStatus(200);
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.url", url -> url.assertThat().asString().endsWith("/j/" + TOKEN.value()));
        verify(renew).renewShareLink(new RenewShareLinkCommand(People.alice(), LIST_ID));
    }

    @Test
    void aNonMemberGets404ProblemJson() {
        doThrow(new ListNotFoundException()).when(get).getShareLink(any());

        var result = mvc.get().uri(PATH).with(AppSessions.bob()).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(result)
                .bodyJson()
                .hasPathSatisfying("$.code", c -> c.assertThat().isEqualTo("LIST_NOT_FOUND"));
    }
}
