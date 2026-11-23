package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.AuditLog;
import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.adapter.in.rest.PendingInvitation;
import de.tantive.groceries.domain.ShareToken;
import de.tantive.groceries.ports.in.JoinListCommand;
import de.tantive.groceries.ports.in.JoinListResult;
import de.tantive.groceries.ports.in.JoinListUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-SHARE-03, FR-AUTH-06 AC3: a logged-in person joins the list behind a token, sent in the body or, after a login
 * that started at an invitation, remembered in the session. The remembered token is used once whatever the outcome:
 * a stale one must not be retried by a reload (ADR 0008).
 */
@WebAdapter
@RestController
@RequestMapping("/api/v1/memberships")
@Tag(name = "sharing")
class JoinListController {

    private final JoinListUseCase joinList;

    JoinListController(JoinListUseCase joinList) {
        this.joinList = joinList;
    }

    @PostMapping("/join")
    @Operation(
            operationId = "joinList",
            summary = "Joins the list behind a share token (body) or behind the token remembered in the session"
                    + " (empty body)")
    @ApiResponse(
            responseCode = "200",
            description = "Joined, or already a member (alreadyMember true, no duplicate)",
            content =
                    @Content(mediaType = "application/json", schema = @Schema(implementation = JoinListResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Unknown or renewed link, or no token at all; code SHARE_LINK_INVALID",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "409",
            description =
                    "Member limit (50) or list limit (100) reached; code MEMBER_LIMIT_REACHED or LIST_LIMIT_REACHED",
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
    JoinListResponse join(
            @RequestBody(required = false) @Nullable JoinListRequest request,
            Authentication authentication,
            HttpServletRequest http) {
        HttpSession session = http.getSession(false);
        String sent = request == null ? null : request.token();
        String candidate = sent == null || sent.isBlank() ? PendingInvitation.peek(session) : sent;
        try {
            var caller = Callers.from(authentication);
            JoinListResult result = joinList.joinList(new JoinListCommand(caller, ShareToken.parse(candidate)));
            if (!result.alreadyMember()) {
                AuditLog.listJoined(caller.userId());
            }
            return JoinListResponse.from(result);
        } finally {
            PendingInvitation.clear(session);
        }
    }
}
