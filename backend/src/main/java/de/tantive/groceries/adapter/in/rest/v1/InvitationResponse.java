package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;

/** What a visitor may learn from a valid link: the list name, nothing else (FR-AUTH-06 AC4). */
@Schema(name = "InvitationResponse")
record InvitationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 80)
        String listName) {}
