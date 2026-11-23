package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.GetCurrentUserQuery;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The logged-in person; the SPA calls it at start-up and starts the login on 401. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final GetCurrentUserUseCase getCurrentUser;

    MeController(GetCurrentUserUseCase getCurrentUser) {
        this.getCurrentUser = getCurrentUser;
    }

    @GetMapping
    @Operation(operationId = "getCurrentUser", summary = "Profile of the logged-in person")
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/problem+json",
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProblemDetail.class)))
    CurrentUserResponse me(Authentication authentication) {
        CurrentUser user = getCurrentUser.currentUser(new GetCurrentUserQuery(Callers.from(authentication)));
        return new CurrentUserResponse(user.id(), user.displayName(), user.email());
    }
}
