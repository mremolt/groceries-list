package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/** The new name of the list; last write wins, there is no version precondition (ADR 0007). */
@Schema(name = "RenameListRequest")
record RenameListRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 80, example = "WG-Vorrat")
        @Nullable
        String name) {}
