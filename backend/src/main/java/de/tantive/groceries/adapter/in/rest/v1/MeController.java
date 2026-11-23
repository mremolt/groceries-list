package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.adapter.in.rest.AuditLog;
import de.tantive.groceries.adapter.in.rest.Callers;
import de.tantive.groceries.adapter.in.rest.ReauthSession;
import de.tantive.groceries.domain.Caller;
import de.tantive.groceries.domain.DisplayName;
import de.tantive.groceries.ports.in.CurrentUser;
import de.tantive.groceries.ports.in.DeleteAccountCommand;
import de.tantive.groceries.ports.in.DeleteAccountUseCase;
import de.tantive.groceries.ports.in.GetCurrentUserQuery;
import de.tantive.groceries.ports.in.GetCurrentUserUseCase;
import de.tantive.groceries.ports.in.UpdateDisplayNameCommand;
import de.tantive.groceries.ports.in.UpdateDisplayNameUseCase;
import de.tantive.groceries.stereotype.WebAdapter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The logged-in person; the SPA calls it at start-up and starts the login on 401. */
@WebAdapter
@RestController
@RequestMapping("/api/v1/me")
class MeController {

    private final GetCurrentUserUseCase getCurrentUser;
    private final UpdateDisplayNameUseCase updateDisplayName;
    private final DeleteAccountUseCase deleteAccount;

    MeController(
            GetCurrentUserUseCase getCurrentUser,
            UpdateDisplayNameUseCase updateDisplayName,
            DeleteAccountUseCase deleteAccount) {
        this.getCurrentUser = getCurrentUser;
        this.updateDisplayName = updateDisplayName;
        this.deleteAccount = deleteAccount;
    }

    @GetMapping
    @Operation(operationId = "getCurrentUser", summary = "Profile of the logged-in person")
    @ApiResponse(
            responseCode = "200",
            description = "The logged-in person",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/json",
                            schema =
                                    @io.swagger.v3.oas.annotations.media.Schema(
                                            implementation = CurrentUserResponse.class)))
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

    @PatchMapping
    @Operation(operationId = "updateCurrentUser", summary = "Changes the display name (FR-SET-01)")
    @ApiResponse(
            responseCode = "200",
            description = "The profile after the change",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/json",
                            schema =
                                    @io.swagger.v3.oas.annotations.media.Schema(
                                            implementation = CurrentUserResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description =
                    "Invalid name; code VALIDATION_FAILED with errors[].code DISPLAY_NAME_REQUIRED or DISPLAY_NAME_TOO_LONG",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/problem+json",
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/problem+json",
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProblemDetail.class)))
    CurrentUserResponse rename(@RequestBody UpdateCurrentUserRequest request, Authentication authentication) {
        CurrentUser user = updateDisplayName.updateDisplayName(
                new UpdateDisplayNameCommand(Callers.from(authentication), DisplayName.of(request.displayName())));
        return new CurrentUserResponse(user.id(), user.displayName(), user.email());
    }

    /** FR-SET-04: needs a login from the last five minutes in this session (the IdP asks for the password, ADR 0003). */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "deleteCurrentUser",
            summary = "Deletes the account after a fresh re-authentication (FR-SET-04)")
    @ApiResponse(
            responseCode = "204",
            description =
                    "The account, its memberships and the lists where the person was the last member are deleted; all sessions ended (FR-SET-04)")
    @ApiResponse(
            responseCode = "401",
            description = "No session; code UNAUTHENTICATED",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/problem+json",
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "403",
            description =
                    "No re-authentication in the last 5 minutes; code REAUTH_REQUIRED. Start GET /oauth2/authorization/keycloak?reauth=1",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/problem+json",
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProblemDetail.class)))
    void delete(Authentication authentication, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Caller caller = Callers.from(authentication);
        deleteAccount.deleteAccount(new DeleteAccountCommand(caller, ReauthSession.confirmedAt(session)));
        AuditLog.accountDeleted(caller.userId());
        // the use case already removed every session of the person; this ends the request's own and expires the cookie
        if (session != null) {
            session.invalidate();
        }
    }
}
