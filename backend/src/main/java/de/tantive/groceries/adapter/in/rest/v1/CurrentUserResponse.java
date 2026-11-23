package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** Profile of the logged-in person. */
@Schema(name = "CurrentUserResponse")
record CurrentUserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Alex Beispiel")
        String displayName,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "alex@beispiel.de")
        String email) {}
