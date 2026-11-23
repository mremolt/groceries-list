package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.domain.ItemText;
import de.tantive.groceries.ports.in.UpdateItemCommand;
import de.tantive.groceries.ports.in.UpdateItemUseCase;
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

/** FR-ITEM-02/03: a member checks, unchecks or edits an item; last write wins (ADR 0007). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists/{listId}/items")
@Tag(name = "items")
class UpdateItemController {

    private final UpdateItemUseCase updateItem;

    UpdateItemController(UpdateItemUseCase updateItem) {
        this.updateItem = updateItem;
    }

    @PatchMapping("/{itemId}")
    @Operation(operationId = "updateItem", summary = "Set the text and/or the done state of an item")
    @ApiResponse(
            responseCode = "200",
            description = "The item after the change (last write wins, ADR 0007)",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ItemResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Neither text nor done, or invalid text; code VALIDATION_FAILED",
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
            description = "No such list, no member or no such item; code LIST_NOT_FOUND or ITEM_NOT_FOUND",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ItemResponse update(
            @PathVariable UUID listId,
            @PathVariable UUID itemId,
            @RequestBody UpdateItemRequest request,
            Authentication authentication) {
        ItemText text = request.text() == null ? null : ItemText.of(request.text());
        return ItemResponse.from(updateItem.updateItem(
                new UpdateItemCommand(Callers.from(authentication), listId, itemId, text, request.done())));
    }
}
