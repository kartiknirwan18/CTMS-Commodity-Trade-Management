package com.ctms.dto;

import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;

/** Trade volume (and value) grouped by commodity. */
public record TradeVolumeResponse(
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        long tradeCount,
        BigDecimal buyQuantity,
        BigDecimal sellQuantity,
        BigDecimal totalQuantity,
        BigDecimal totalValue
) {
}
