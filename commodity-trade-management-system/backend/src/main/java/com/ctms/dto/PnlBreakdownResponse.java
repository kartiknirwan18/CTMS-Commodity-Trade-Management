package com.ctms.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Realized P&L breakdown of every commodity, used by the Reports screen and the
 * dashboard P&L widget.
 */
public record PnlBreakdownResponse(
        List<PnlItemResponse> items,
        BigDecimal totalRealizedPnl,
        boolean realizedPnlAvailable,
        String costBasisMethod,
        String disclaimer
) {
}
