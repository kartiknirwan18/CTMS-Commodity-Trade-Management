package com.ctms.dto;

import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trade representation returned by the REST API.
 *
 * <p>{@code totalValue} is derived (quantity x price per unit) and read-only:
 * a client can never submit a total that disagrees with its inputs.</p>
 */
public record TradeResponse(
        Long id,
        String tradeReference,
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        TradeType tradeType,
        BigDecimal quantity,
        BigDecimal pricePerUnit,
        BigDecimal totalValue,
        LocalDate tradeDate,
        String counterparty,
        Long contractId,
        String contractReference,
        TradeStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
