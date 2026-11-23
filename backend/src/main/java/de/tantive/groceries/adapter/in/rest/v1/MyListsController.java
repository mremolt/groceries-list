package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.domain.ListSummary;
import de.tantive.groceries.ports.in.GetListQuery;
import de.tantive.groceries.ports.in.GetListUseCase;
import de.tantive.groceries.ports.in.ListMyListsQuery;
import de.tantive.groceries.ports.in.ListMyListsUseCase;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Reads of the lists a person is a member of (BR-01, BR-10, FR-NAV-02, FR-LIST-05). */
@WebAdapter
@RestController
@RequestMapping("/api/v1/lists")
@Tag(name = "lists")
class MyListsController {

    private final ListMyListsUseCase listMyLists;
    private final GetListUseCase getList;

    MyListsController(ListMyListsUseCase listMyLists, GetListUseCase getList) {
        this.listMyLists = listMyLists;
        this.getList = getList;
    }

    @GetMapping
    @Operation(
            operationId = "listMyLists",
            summary = "The lists of the logged-in person, at most 100, oldest membership first")
    @ApiResponse(
            responseCode = "200",
            description = "The lists, possibly none",
            content =
                    @Content(mediaType = "application/json", schema = @Schema(implementation = MyListsResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    MyListsResponse myLists(Authentication authentication) {
        List<ListSummary> lists = listMyLists.listMyLists(new ListMyListsQuery(Callers.from(authentication)));
        return new MyListsResponse(lists.stream().map(ListResponse::from).toList());
    }

    @GetMapping("/{listId}")
    @Operation(operationId = "getList", summary = "One list of the logged-in person")
    @ApiResponse(
            responseCode = "200",
            description = "The list",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ListResponse.class)))
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
    ListResponse list(@PathVariable UUID listId, Authentication authentication) {
        return ListResponse.from(getList.getList(new GetListQuery(Callers.from(authentication), listId)));
    }
}
