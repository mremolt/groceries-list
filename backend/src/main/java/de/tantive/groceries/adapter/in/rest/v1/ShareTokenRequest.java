package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/** A token in a body, never in a URL (ADR 0008). Missing or malformed is the same answer as unknown: an invalid link. */
@Schema(name = "ShareTokenRequest")
record ShareTokenRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 64) @Nullable
        String token) {}
