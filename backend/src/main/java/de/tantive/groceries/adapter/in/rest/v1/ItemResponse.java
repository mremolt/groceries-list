package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.domain.Item;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/** An item of a list. */
@Schema(name = "ItemResponse")
record ItemResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 200)
        String text,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean done,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long version) {

    static ItemResponse from(Item item) {
        return new ItemResponse(item.id(), item.text().value(), item.done(), item.createdAt(), item.version());
    }
}
