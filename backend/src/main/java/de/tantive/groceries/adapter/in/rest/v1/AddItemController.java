package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.domain.Item;
import de.tantive.groceries.domain.ItemText;
import de.tantive.groceries.ports.in.AddItemCommand;
import de.tantive.groceries.ports.in.AddItemUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-ITEM-01: a member adds one free-text line at the end of the open items. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists/{listId}/items")
@Tag(name = "items")
class AddItemController {

    private final AddItemUseCase addItem;

    AddItemController(AddItemUseCase addItem) {
        this.addItem = addItem;
    }

    @PostMapping
    @Operation(operationId = "addItem", summary = "Add an item at the end of the open items")
    @ApiResponse(
            responseCode = "201",
            description = "The new item; Location points to it",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ItemResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Invalid text; code VALIDATION_FAILED with errors[].code TEXT_REQUIRED or TEXT_TOO_LONG",
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
    @ApiResponse(
            responseCode = "409",
            description = "500 items reached (BR-12); code ITEM_LIMIT_REACHED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ResponseEntity<ItemResponse> add(
            @PathVariable UUID listId, @RequestBody AddItemRequest request, Authentication authentication) {
        Item added =
                addItem.addItem(new AddItemCommand(Callers.from(authentication), listId, ItemText.of(request.text())));
        return ResponseEntity.created(URI.create("/api/v1/lists/" + listId + "/items/" + added.id()))
                .body(ItemResponse.from(added));
    }
}
