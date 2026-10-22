package com.ctms.service;

import java.math.BigDecimal;

/**
 * Result of matching the confirmed buy/sell quantities of one commodity with
 * the FIFO cost basis method.
 *
 * @param buyQuantity        total confirmed buy quantity
 * @param sellQuantity       total confirmed sell quantity
 * @param matchedQuantity    quantity for which a buy and a sell were matched
 * @param openBuyQuantity    buy quantity still unmatched (open long position)
 * @param openSellQuantity   sell quantity still unmatched (open short position)
 * @param realizedPnl        realized profit/loss, {@code null} when nothing matched
 * @param realizedPnlAvailable {@code false} means "P&L Not Available"
 * @param message            human readable explanation for the UI
 */
public record PnlResult(
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
