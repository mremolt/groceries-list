package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.ItemsSnapshot;
import de.tantive.groceries.ports.in.ListItemsQuery;
import de.tantive.groceries.ports.in.ListItemsUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
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
            headers =
                    @Header(
                            name = "ETag",
                            description = "Strong ETag of the snapshot, the list revision in quotes",
                            schema = @Schema(type = "string")),
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ItemsResponse.class)))
    @ApiResponse(
            responseCode = "304",
            description = "The list did not change since the snapshot named in If-None-Match; no body, the ETag header"
                    + " is repeated",
            headers =
                    @Header(
                            name = "ETag",
                            description = "Strong ETag of the snapshot, the list revision in quotes",
                            schema = @Schema(type = "string")),
            content = @Content)
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
    ResponseEntity<ItemsResponse> list(
            @PathVariable UUID listId,
            @Parameter(
                            description = "The ETag of the snapshot the client already holds; the server answers 304"
                                    + " without reading any item when the list did not change (ADR 0006, NFR-PERF-04)",
                            schema = @Schema(type = "string"))
                    @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false)
                    @Nullable
                    String ifNoneMatch,
            Authentication authentication) {
        ItemsSnapshot snapshot = listItems.listItems(
                new ListItemsQuery(Callers.from(authentication), listId, knownRevision(ifNoneMatch)));
        ResponseEntity.BodyBuilder response =
                ResponseEntity.status(snapshot.notModified() ? 304 : 200).eTag("\"" + snapshot.revision() + "\"");
        return snapshot.notModified() ? response.build() : response.body(ItemsResponse.from(snapshot.requireItems()));
    }

    /** One strong or weak validator holding a revision; anything else (several, {@code *}, text) means "no validator". */
    private static @Nullable Long knownRevision(@Nullable String ifNoneMatch) {
        if (ifNoneMatch == null) {
            return null;
        }
        String value = ifNoneMatch.strip();
        if (value.startsWith("W/")) {
            value = value.substring(2);
        }
        if (value.length() < 3 || value.charAt(0) != '"' || value.charAt(value.length() - 1) != '"') {
            return null;
        }
        String digits = value.substring(1, value.length() - 1);
        if (digits.length() > 18 || !digits.chars().allMatch(c -> c >= '0' && c <= '9')) {
            return null;
        }
        return Long.parseLong(digits);
    }
}
