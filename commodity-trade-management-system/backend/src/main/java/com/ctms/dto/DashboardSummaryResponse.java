package com.ctms.dto;

/**
 * Aggregated key metrics shown on the dashboard.
 *
 * <p>Every field is computed from the trade/contract tables on each request -
 * nothing is cached or hardcoded.</p>
 */
public record DashboardSummaryResponse(
        long totalTrades,
        long draftTrades,
        long confirmedTrades,
        long cancelledTrades,
        long totalBuyTrades,
        long totalSellTrades,
        java.math.BigDecimal totalTradeVolume,
        java.math.BigDecimal totalTradeValue,
        java.math.BigDecimal realizedPnl,
        boolean realizedPnlAvailable,
        java.math.BigDecimal unrealizedPnl,
        boolean unrealizedPnlAvailable,
        String pnlMessage,
        String pnlDisclaimer,
        long totalCommodities,
        long activeCommodities,
        long activeContracts,
        long upcomingDeliveries,
        int upcomingDeliveryWindowDays
) {
}
