package de.tantive.groceries.adapter.in.rest.v1;

import io.swagger.v3.oas.annotations.media.Schema;

/** The share link of a list: the complete address people paste into a messenger (FR-SHARE-01 AC4). */
@Schema(name = "ShareLinkResponse")
record ShareLinkResponse(
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                maxLength = 2048,
                description = "The complete link, <public base URL>/j/<token>")
        String url) {}
