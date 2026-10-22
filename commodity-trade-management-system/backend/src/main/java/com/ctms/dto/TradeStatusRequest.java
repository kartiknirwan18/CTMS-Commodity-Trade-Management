package com.ctms.dto;

import com.ctms.entity.TradeStatus;
import jakarta.validation.constraints.NotNull;

/** Payload of {@code PATCH /api/trades/{id}/status}. */
public record TradeStatusRequest(
        @NotNull(message = "Trade status is required")
        TradeStatus status
) {
}
