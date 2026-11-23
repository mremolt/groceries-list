package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.domain.Item;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** The items of a list, oldest first, at most 500 (BR-09, BR-12). */
@Schema(name = "ItemsResponse")
record ItemsResponse(
        @ArraySchema(
                schema = @Schema(implementation = ItemResponse.class),
                maxItems = Item.MAX_ITEMS_PER_LIST,
                arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED))
        List<ItemResponse> items) {

    static ItemsResponse from(List<Item> items) {
        return new ItemsResponse(items.stream().map(ItemResponse::from).toList());
    }
}
