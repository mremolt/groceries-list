package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/** The token of the link; absent or empty means the one remembered in the session before the login (FR-AUTH-06 AC3). */
@Schema(name = "JoinListRequest")
record JoinListRequest(
        @Schema(
                maxLength = 64,
                description = "The share token; absent or empty means the one remembered in the session")
        @Nullable
        String token) {}
