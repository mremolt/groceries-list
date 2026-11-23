package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.LeaveListCommand;
import de.tantive.groceries.ports.in.LeaveListUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** FR-LIST-04, BR-03/BR-04: a member leaves; members cannot remove others; the last member leaving deletes the list. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists")
@Tag(name = "lists")
class LeaveListController {

    private final LeaveListUseCase leaveList;

    LeaveListController(LeaveListUseCase leaveList) {
        this.leaveList = leaveList;
    }

    @DeleteMapping("/{listId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "leaveList", summary = "Leave a list; the last member leaving deletes it")
    @ApiResponse(responseCode = "204", description = "Left")
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
    void leave(@PathVariable UUID listId, Authentication authentication) {
        leaveList.leaveList(new LeaveListCommand(Callers.from(authentication), listId));
    }
}
