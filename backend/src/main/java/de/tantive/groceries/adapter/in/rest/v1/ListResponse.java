package de.tantive.groceries.adapter.in.rest.v1;

import de.tantive.groceries.domain.ListSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** A list as a member sees it in the navigation. */
@Schema(name = "ListResponse")
record ListResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Wocheneinkauf", maxLength = 80)
        String name,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Number of items that are not checked yet",
                minimum = "0")
        int openCount,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Changes whenever the list or one of its items changes")
        long revision) {

    static ListResponse from(ListSummary summary) {
        return new ListResponse(summary.id(), summary.name(), summary.openCount(), summary.revision());
    }
}
