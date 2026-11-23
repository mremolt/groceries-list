package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.domain.Item;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** The ids of the items that were checked when the user confirmed (FR-ITEM-05 AC4). */
@Schema(name = "ClearCheckedRequest")
record ClearCheckedRequest(
        @ArraySchema(
                schema = @Schema(format = "uuid"),
                maxItems = Item.MAX_ITEMS_PER_LIST,
                arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED))
        @Nullable
        List<UUID> itemIds) {}
