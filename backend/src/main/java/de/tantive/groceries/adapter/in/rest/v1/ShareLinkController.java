package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.AuditLog;
import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.adapter.in.rest.SharingProperties;
import de.tantive.groceries.ports.in.GetShareLinkQuery;
import de.tantive.groceries.ports.in.GetShareLinkUseCase;
import de.tantive.groceries.ports.in.RenewShareLinkCommand;
import de.tantive.groceries.ports.in.RenewShareLinkUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-SHARE-01/02, BR-06: the link of a list for its members, and its renewal. The link is the token (NFR-SEC-05). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists")
@Tag(name = "sharing")
class ShareLinkController {

    private final GetShareLinkUseCase getShareLink;
    private final RenewShareLinkUseCase renewShareLink;
    private final SharingProperties sharing;

    ShareLinkController(
            GetShareLinkUseCase getShareLink, RenewShareLinkUseCase renewShareLink, SharingProperties sharing) {
        this.getShareLink = getShareLink;
        this.renewShareLink = renewShareLink;
        this.sharing = sharing;
    }

    @GetMapping("/{listId}/share-link")
    @Operation(operationId = "getShareLink", summary = "The share link of a list (members only)")
    @ApiResponse(
            responseCode = "200",
            description = "The current link of the list",
            content =
                    @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ShareLinkResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No such list or no member; code LIST_NOT_FOUND, the same answer for both",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ShareLinkResponse get(@PathVariable UUID listId, Authentication authentication) {
        var token = getShareLink.getShareLink(new GetShareLinkQuery(Callers.from(authentication), listId));
        return new ShareLinkResponse(sharing.linkOf(token.value()));
    }

    @PostMapping("/{listId}/share-link/renew")
    @Operation(
            operationId = "renewShareLink",
            summary = "Replaces the share link of a list (FR-SHARE-02); memberships stay")
    @ApiResponse(
            responseCode = "200",
            description = "The new link; the previous one is invalid from now on",
            content =
                    @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ShareLinkResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No such list or no member; code LIST_NOT_FOUND, the same answer for both",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ShareLinkResponse renew(@PathVariable UUID listId, Authentication authentication) {
        var caller = Callers.from(authentication);
        var token = renewShareLink.renewShareLink(new RenewShareLinkCommand(caller, listId));
        AuditLog.shareLinkRenewed(caller.userId());
        return new ShareLinkResponse(sharing.linkOf(token.value()));
    }
}
