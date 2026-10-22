package com.ctms.dto;

import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Flat, read-only view of a trade row used by the dashboard/report aggregations.
 *
 * <p>Aggregation is done in the service layer from this projection instead of
 * with database specific SQL functions, which keeps the same code working on
 * both MySQL and the in-memory H2 database used for local runs and tests.</p>
 */
public record TradeAggregateRow(
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        TradeType tradeType,
        TradeStatus status,
        BigDecimal quantity,
        BigDecimal pricePerUnit,
        LocalDate tradeDate
) {
    /** Monetary value of the row (quantity x price). */
    public BigDecimal value() {
        if (quantity == null || pricePerUnit == null) {
            return BigDecimal.ZERO;
        }
        return quantity.multiply(pricePerUnit);
    }

    /** Quantity of the row (never null). */
    public BigDecimal safeQuantity() {
        return quantity == null ? BigDecimal.ZERO : quantity;
    }
}
