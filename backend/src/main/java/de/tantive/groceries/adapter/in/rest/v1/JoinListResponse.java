package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.ports.in.JoinListResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** The list the person is a member of now; {@code alreadyMember} tells the UI to skip the snackbar (FR-SHARE-03 AC2). */
@Schema(name = "JoinListResponse")
record JoinListResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID listId,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 80)
        String listName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean alreadyMember) {

    static JoinListResponse from(JoinListResult result) {
        return new JoinListResponse(result.listId(), result.listName().value(), result.alreadyMember());
    }
}
