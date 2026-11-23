package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/** At least one of text and done; a set without a version precondition (ADR 0007). */
@Schema(name = "UpdateItemRequest", description = "At least one of text and done")
record UpdateItemRequest(
        @Schema(minLength = 1, maxLength = 200) @Nullable String text,
        @Nullable Boolean done) {}
