package com.ctms.dto;

import jakarta.validation.constraints.NotNull;

/** Payload of {@code PATCH /api/commodities/{id}/status}. */
public record CommodityStatusRequest(
        @NotNull(message = "Active flag is required")
        Boolean active
) {
}
