package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.domain.ListName;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.CreateListCommand;
import de.tantive.groceries.ports.in.CreateListUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-LIST-01: a person creates a list and becomes its only member. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists")
@Tag(name = "lists")
class CreateListController {

    private final CreateListUseCase createList;

    CreateListController(CreateListUseCase createList) {
        this.createList = createList;
    }

    @PostMapping
    @Operation(operationId = "createList", summary = "Create a list; the caller becomes its only member")
    @ApiResponse(
            responseCode = "201",
            description = "The new list; Location points to it",
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
            responseCode = "409",
            description = "100 lists reached (BR-12); code LIST_LIMIT_REACHED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    ResponseEntity<ListResponse> create(@RequestBody CreateListRequest request, Authentication authentication) {
        ListSummary created =
                createList.createList(new CreateListCommand(Callers.from(authentication), ListName.of(request.name())));
        return ResponseEntity.created(URI.create("/api/v1/lists/" + created.id()))
                .body(ListResponse.from(created));
    }
}
