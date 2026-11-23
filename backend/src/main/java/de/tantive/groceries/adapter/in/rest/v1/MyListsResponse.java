package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** The lists of the logged-in person, oldest membership first; at most 100 (BR-12). */
@Schema(name = "MyListsResponse")
record MyListsResponse(
        @ArraySchema(
                maxItems = 100,
                schema = @Schema(implementation = ListResponse.class),
                arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED))
        List<ListResponse> lists) {}
