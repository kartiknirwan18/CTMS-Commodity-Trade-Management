package com.ctms.dto;

import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;

/**
 * Available profit and loss information for a trade or for the commodity
 * position the trade belongs to.
 *
 * <p>Realized P&L is only reported when at least one buy and one sell of the
 * same commodity and unit could be matched (FIFO). Unrealized P&L is always
 * {@code null} because the system does not store market prices - the API
 * returns {@code "Not Available"} through {@code unrealizedPnlAvailable =
 * false} instead of inventing a number.</p>
 */
public record PnlResponse(
        Long tradeId,
        String tradeReference,
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        BigDecimal buyQuantity,
        BigDecimal sellQuantity,
        BigDecimal matchedQuantity,
        BigDecimal openBuyQuantity,
        BigDecimal openSellQuantity,
        String costBasisMethod,
        BigDecimal realizedPnl,
        boolean realizedPnlAvailable,
        BigDecimal unrealizedPnl,
        boolean unrealizedPnlAvailable,
        String openPositionMessage,
        String disclaimer
) {
}
