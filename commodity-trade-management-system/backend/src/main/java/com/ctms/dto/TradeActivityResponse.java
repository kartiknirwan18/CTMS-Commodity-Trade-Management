package com.ctms.dto;

import java.math.BigDecimal;

/**
 * Trade activity for one calendar month.
 *
 * <p>Months without any trade are returned with zero values so charts show a
 * continuous timeline.</p>
 */
public record TradeActivityResponse(
        String period,
        String label,
        long tradeCount,
        long buyCount,
        long sellCount,
        BigDecimal buyValue,
        BigDecimal sellValue,
        BigDecimal totalValue,
        BigDecimal totalQuantity
) {
}
