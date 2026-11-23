package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;

/** Input of PATCH /api/v1/me: the new display name (FR-SET-01). Validated by the domain, which owns the rules. */
@Schema(name = "UpdateCurrentUserRequest")
record UpdateCurrentUserRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 50, example = "Alex Beispiel")
        String displayName) {}
