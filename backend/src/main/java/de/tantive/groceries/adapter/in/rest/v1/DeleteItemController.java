package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.DeleteItemCommand;
import de.tantive.groceries.ports.in.DeleteItemUseCase;
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

/** FR-ITEM-04: a member deletes an item without further confirmation (BR-11). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists/{listId}/items")
@Tag(name = "items")
class DeleteItemController {

    private final DeleteItemUseCase deleteItem;

    DeleteItemController(DeleteItemUseCase deleteItem) {
        this.deleteItem = deleteItem;
    }

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "deleteItem",
            summary = "Delete an item without confirmation (BR-11); an already deleted item answers 204")
    @ApiResponse(responseCode = "204", description = "Deleted")
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
    void delete(@PathVariable UUID listId, @PathVariable UUID itemId, Authentication authentication) {
        deleteItem.deleteItem(new DeleteItemCommand(Callers.from(authentication), listId, itemId));
    }
}
