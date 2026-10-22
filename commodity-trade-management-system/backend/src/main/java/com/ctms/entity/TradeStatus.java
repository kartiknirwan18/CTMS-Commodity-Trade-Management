package com.ctms.entity;

/**
 * Life cycle of a trade. Trades are never hard deleted: cancelling simply moves
 * a trade to {@link #CANCELLED} so the audit trail stays intact.
 */
public enum TradeStatus {
    DRAFT,
    CONFIRMED,
    CANCELLED
}
