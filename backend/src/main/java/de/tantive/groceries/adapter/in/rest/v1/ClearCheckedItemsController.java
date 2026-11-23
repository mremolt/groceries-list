package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.ClearCheckedItemsCommand;
import de.tantive.groceries.ports.in.ClearCheckedItemsUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-ITEM-05: removes those of the given items that are still checked. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists/{listId}/items")
@Tag(name = "items")
class ClearCheckedItemsController {

    private final ClearCheckedItemsUseCase clearChecked;

    ClearCheckedItemsController(ClearCheckedItemsUseCase clearChecked) {
        this.clearChecked = clearChecked;
    }

    @PostMapping("/clear-checked")
    @Operation(operationId = "clearCheckedItems", summary = "Delete the given items that are still checked")
    @ApiResponse(
            responseCode = "200",
            description = "Number of items removed; only ids that are still checked are deleted",
            content =
                    @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ClearCheckedResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "More than 500 ids; code VALIDATION_FAILED",
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
            description = "No such list or no member; code LIST_NOT_FOUND",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ClearCheckedResponse clear(
            @PathVariable UUID listId, @RequestBody ClearCheckedRequest request, Authentication authentication) {
        List<UUID> ids = request.itemIds() == null ? List.of() : request.itemIds();
        return new ClearCheckedResponse(
                clearChecked.clearCheckedItems(ClearCheckedItemsCommand.of(Callers.from(authentication), listId, ids)));
    }
}
