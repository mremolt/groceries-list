package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/**
 * The name is checked by the domain, so the error codes are the field codes of the contract (NAME_REQUIRED,
 * NAME_TOO_LONG); a missing name is the same error as an empty one.
 */
@Schema(name = "CreateListRequest")
record CreateListRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 80, example = "Wocheneinkauf")
        @Nullable
        String name) {}
