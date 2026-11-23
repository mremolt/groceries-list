package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.ListItemsQuery;
import de.tantive.groceries.ports.in.ListItemsUseCase;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The items of a list for its members (BR-01, BR-09). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists/{listId}/items")
@Tag(name = "items")
class ListItemsController {

    private final ListItemsUseCase listItems;

    ListItemsController(ListItemsUseCase listItems) {
        this.listItems = listItems;
    }

    @GetMapping
    @Operation(operationId = "listItems", summary = "The items of a list")
    @ApiResponse(
            responseCode = "200",
            description = "The items, oldest first (BR-09), at most 500",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ItemsResponse.class)))
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
    ItemsResponse list(@PathVariable UUID listId, Authentication authentication) {
        return ItemsResponse.from(listItems.listItems(new ListItemsQuery(Callers.from(authentication), listId)));
    }
}
