package com.ctms.repository;

import com.ctms.dto.TradeAggregateRow;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * Data access for trades.
 */
public interface TradeRepository extends JpaRepository<Trade, Long>, JpaSpecificationExecutor<Trade> {

    boolean existsByCommodityId(Long commodityId);

    boolean existsByTradeReferenceIgnoreCase(String tradeReference);

    long countByStatus(TradeStatus status);

    long countByTradeType(TradeType tradeType);

    /** Number of trades already generated for a reference prefix, used by the reference generator. */
    long countByTradeReferenceStartingWith(String prefix);

    /** Confirmed trades of one commodity in chronological order (FIFO matching input). */
    List<Trade> findByCommodityIdAndStatusOrderByTradeDateAscIdAsc(Long commodityId, TradeStatus status);

    /**
     * All trades as a flat projection, orderded by trade date. The dashboard,
     * the reports and the P&L service derive every metric from this single
     * result set (see {@link TradeAggregateRow}).
     */
    @Query("""
            SELECT new com.ctms.dto.TradeAggregateRow(
                t.commodity.id,
                t.commodity.name,
                t.commodity.unitOfMeasurement,
                t.tradeType,
                t.status,
                t.quantity,
                t.pricePerUnit,
                t.tradeDate)
            FROM Trade t
            ORDER BY t.tradeDate ASC, t.id ASC
            """)
    List<TradeAggregateRow> fetchTradeAggregateRows();
}
