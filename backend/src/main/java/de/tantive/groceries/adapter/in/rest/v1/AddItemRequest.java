package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

/** The text of the new item. The id is chosen by the server. */
@Schema(name = "AddItemRequest")
record AddItemRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 200, example = "Milch")
        @Nullable
        String text) {}
