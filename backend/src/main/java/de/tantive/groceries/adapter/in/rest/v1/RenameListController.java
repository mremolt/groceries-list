package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.ports.in.RenameListCommand;
import de.tantive.groceries.ports.in.RenameListUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-LIST-02: any member renames the list; last write wins (ADR 0007). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists")
@Tag(name = "lists")
class RenameListController {

    private final RenameListUseCase renameList;

    RenameListController(RenameListUseCase renameList) {
        this.renameList = renameList;
    }

    @PatchMapping("/{listId}")
    @Operation(operationId = "renameList", summary = "Rename a list; the new name is visible to all members")
    @ApiResponse(
            responseCode = "200",
            description = "The renamed list",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ListResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Invalid name; code VALIDATION_FAILED with errors[].code NAME_REQUIRED or NAME_TOO_LONG",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
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
    ListResponse rename(
            @PathVariable UUID listId, @RequestBody RenameListRequest request, Authentication authentication) {
        return ListResponse.from(renameList.renameList(
                new RenameListCommand(Callers.from(authentication), listId, ListName.of(request.name()))));
    }
}
