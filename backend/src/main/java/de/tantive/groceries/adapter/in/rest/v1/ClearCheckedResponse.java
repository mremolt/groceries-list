package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;

/** How many items were removed. */
@Schema(name = "ClearCheckedResponse")
record ClearCheckedResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0")
        int removed) {}
