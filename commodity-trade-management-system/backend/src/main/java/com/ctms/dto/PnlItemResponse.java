package com.ctms.dto;

import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;

/** P&L detail for a single commodity position. */
public record PnlItemResponse(
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        BigDecimal buyQuantity,
        BigDecimal sellQuantity,
        BigDecimal matchedQuantity,
        BigDecimal openBuyQuantity,
        BigDecimal openSellQuantity,
        BigDecimal realizedPnl,
        boolean realizedPnlAvailable,
        String message
) {
}
