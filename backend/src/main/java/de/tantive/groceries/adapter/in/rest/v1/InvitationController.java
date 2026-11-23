package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.PendingInvitation;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.LookupInvitationQuery;
import de.tantive.groceries.ports.in.LookupInvitationUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-AUTH-06: the only public API (ADR 0003, ADR 0008). A visitor without an account sees the list name on the
 * invitation page and has the token remembered in a server-side session before the login. The token is in the body,
 * both calls are rate limited per address, and a wrong token gets the same answer as an unknown one (FR-SHARE-04).
 */
@WebAdapter
@RestController
@RequestMapping("/api/v1/invitations")
@Tag(name = "sharing")
class InvitationController {

    private final LookupInvitationUseCase lookup;

    InvitationController(LookupInvitationUseCase lookup) {
        this.lookup = lookup;
    }

    @PostMapping("/lookup")
    @Operation(
            operationId = "lookupInvitation",
            summary = "Public. The list name for the invitation banner (FR-AUTH-06 AC1, AC4)")
    @ApiResponse(
            responseCode = "200",
            description = "The name of the list behind the link, nothing else",
            content =
                    @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = InvitationResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Unknown or renewed link; code SHARE_LINK_INVALID, the same answer for both",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "429",
            description = "Too many requests; code RATE_LIMITED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    InvitationResponse lookup(@RequestBody ShareTokenRequest request) {
        var name = lookup.lookupInvitation(new LookupInvitationQuery(ShareToken.parse(request.token())));
        return new InvitationResponse(name.value());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "rememberInvitation",
            summary = "Public. Remembers the share token in the session before the login (FR-AUTH-06)")
    @ApiResponse(
            responseCode = "204",
            description = "The link is valid and remembered in the server-side session until the login has finished")
    @ApiResponse(
            responseCode = "404",
            description = "Unknown or renewed link; code SHARE_LINK_INVALID, the same answer for both",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "429",
            description = "Too many requests; code RATE_LIMITED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    void remember(@RequestBody ShareTokenRequest request, HttpServletRequest http) {
        ShareToken token = ShareToken.parse(request.token());
        lookup.lookupInvitation(new LookupInvitationQuery(token)); // validates: no session is created for a wrong token
        PendingInvitation.remember(http.getSession(), token);
    }
}
