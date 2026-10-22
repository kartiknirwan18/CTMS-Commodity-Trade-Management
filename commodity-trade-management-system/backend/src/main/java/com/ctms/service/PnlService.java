package com.ctms.service;

import com.ctms.dto.PnlResponse;
import com.ctms.dto.TradeAggregateRow;
import com.ctms.entity.Commodity;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.repository.TradeRepository;
import com.ctms.util.Numbers;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * Simplified, clearly documented profit and loss calculation.
 *
 * <h2>Method</h2>
 * <ol>
 *   <li>Only <b>CONFIRMED</b> trades take part. DRAFT trades are not yet real
 *       and CANCELLED trades never happened.</li>
 *   <li>Trades are matched per <b>commodity</b> and per <b>unit of
 *       measurement</b>: barrels are never netted against metric tons.</li>
 *   <li>Cost basis is <b>FIFO</b> (first in, first out): every sell consumes
 *       the oldest still open buy quantity first.</li>
 *   <li>Realized P&L = sum over each match of
 *       {@code matchedQuantity x (sellPrice - buyPrice)}.</li>
 * </ol>
 *
 * <h2>Limitations (deliberate)</h2>
 * <ul>
 *   <li>Any quantity that cannot be matched stays an <b>open position</b>.
 *       Its unrealized P&L would need a market price, which this system does
 *       not maintain, so it is reported as "Not Available" instead of a
 *       made-up number.</li>
 *   <li>When nothing can be matched at all, realized P&L is reported as
 *       "Not Available" rather than {@code 0}, because zero would wrongly
 *       suggest a break-even position.</li>
 *   <li>This is an estimate for learning purposes and not official accounting.
 *       The disclaimer travels with every P&amp;L response.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class PnlService {

    public static final String COST_BASIS_METHOD = "FIFO";

    public static final String PNL_DISCLAIMER =
            "Estimated P&L for demonstration purposes only - not official accounting or financial advice.";

    private final TradeRepository tradeRepository;

    public PnlService(TradeRepository tradeRepository) {
        this.tradeRepository = tradeRepository;
    }

    /**
     * P&L for one trade: the trade is located, then the whole commodity
     * position it belongs to is matched.
     */
    public PnlResponse pnlForTrade(Long tradeId) {
        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Trade", tradeId));
        Commodity commodity = trade.getCommodity();

        List<TradeAggregateRow> confirmedRows = tradeRepository
                .findByCommodityIdAndStatusOrderByTradeDateAscIdAsc(commodity.getId(), TradeStatus.CONFIRMED)
                .stream()
                .map(this::toRow)
                .toList();

        PnlResult result = compute(commodity.getName(), commodity.getUnitOfMeasurement(), confirmedRows);

        boolean available = result.realizedPnlAvailable();
        String message = result.message();
        if (trade.getStatus() != TradeStatus.CONFIRMED) {
            available = false;
            message = "This trade is " + trade.getStatus()
                    + " and is excluded from P&L matching. " + message;
        }

        return new PnlResponse(
                trade.getId(),
                trade.getTradeReference(),
                commodity.getId(),
                commodity.getName(),
                commodity.getUnitOfMeasurement(),
                result.buyQuantity(),
                result.sellQuantity(),
                result.matchedQuantity(),
                result.openBuyQuantity(),
                result.openSellQuantity(),
                COST_BASIS_METHOD,
                result.realizedPnl(),
                available,
                null,
                false,
                message,
                PNL_DISCLAIMER
        );
    }

    /** Matches the confirmed rows of one commodity. */
    public PnlResult compute(String commodityName,
                             UnitOfMeasurement unit,
                             List<TradeAggregateRow> confirmedRows) {
        List<PositionEntry> entries = confirmedRows.stream()
                .filter(row -> row.status() == TradeStatus.CONFIRMED)
                .map(row -> new PositionEntry(row.tradeType(), row.safeQuantity(), Numbers.orZero(row.pricePerUnit())))
                .toList();
        return match(commodityName, unit, entries);
    }

    /** Core FIFO matching algorithm, independent of how the data was loaded. */
    public static PnlResult match(String commodityName, UnitOfMeasurement unit, List<PositionEntry> entries) {
        BigDecimal buyQuantity = Numbers.zero();
        BigDecimal sellQuantity = Numbers.zero();
        BigDecimal matchedQuantity = Numbers.zero();
        BigDecimal realized = Numbers.zero();
        BigDecimal unmatchedSell = Numbers.zero();

        Deque<Lot> openBuyLots = new ArrayDeque<>();

        for (PositionEntry entry : entries) {
            BigDecimal quantity = Numbers.orZero(entry.quantity());
            BigDecimal price = Numbers.orZero(entry.pricePerUnit());

            if (entry.tradeType() == TradeType.BUY) {
                buyQuantity = buyQuantity.add(quantity);
                openBuyLots.addLast(new Lot(quantity, price));
                continue;
            }

            sellQuantity = sellQuantity.add(quantity);
            BigDecimal remaining = quantity;
            while (remaining.signum() > 0 && !openBuyLots.isEmpty()) {
                Lot lot = openBuyLots.pollFirst();
                BigDecimal matched = lot.quantity().min(remaining);
                realized = realized.add(matched.multiply(price.subtract(lot.price())));
                matchedQuantity = matchedQuantity.add(matched);
                remaining = remaining.subtract(matched);
                BigDecimal leftover = lot.quantity().subtract(matched);
                if (leftover.signum() > 0) {
                    openBuyLots.addFirst(new Lot(leftover, lot.price()));
                }
            }
            unmatchedSell = unmatchedSell.add(remaining);
        }

        BigDecimal openBuy = openBuyLots.stream()
                .map(Lot::quantity)
                .reduce(Numbers.zero(), BigDecimal::add);

        boolean available = matchedQuantity.signum() > 0;
        String message = buildMessage(commodityName, unit, matchedQuantity, openBuy, unmatchedSell, available);

        return new PnlResult(
                Numbers.toScale(buyQuantity),
                Numbers.toScale(sellQuantity),
                Numbers.toScale(matchedQuantity),
                Numbers.toScale(openBuy),
                Numbers.toScale(unmatchedSell),
                available ? Numbers.toScale(realized) : null,
                available,
                message
        );
    }

    private static String buildMessage(String commodityName,
                                       UnitOfMeasurement unit,
                                       BigDecimal matchedQuantity,
                                       BigDecimal openBuy,
                                       BigDecimal unmatchedSell,
                                       boolean available) {
        String unitLabel = unit == null ? "units" : unit.name();
        if (!available) {
            return "No buy and sell quantity of " + commodityName
                    + " could be matched, so realized P&L is not available.";
        }
        StringBuilder message = new StringBuilder()
                .append(matchedQuantity.stripTrailingZeros().toPlainString())
                .append(' ').append(unitLabel)
                .append(" matched using FIFO cost basis");
        if (openBuy.signum() > 0) {
            message.append("; ")
                    .append(openBuy.stripTrailingZeros().toPlainString()).append(' ').append(unitLabel)
                    .append(" buy position remains open (unrealized P&L is not available)");
        }
        if (unmatchedSell.signum() > 0) {
            message.append("; ")
                    .append(unmatchedSell.stripTrailingZeros().toPlainString()).append(' ').append(unitLabel)
                    .append(" sell position remains open (unrealized P&L is not available)");
        }
        if (openBuy.signum() == 0 && unmatchedSell.signum() == 0) {
            message.append("; the position is fully matched");
        }
        return message.append('.').toString();
    }

    /** One open buy lot: a quantity bought at a given price. */
    private record Lot(BigDecimal quantity, BigDecimal price) {
    }

    /** Direction, quantity and price of a single trade used by the matching. */
    public record PositionEntry(TradeType tradeType, BigDecimal quantity, BigDecimal pricePerUnit) {
    }

    private TradeAggregateRow toRow(Trade trade) {
        Commodity commodity = trade.getCommodity();
        return new TradeAggregateRow(
                commodity.getId(),
                commodity.getName(),
                commodity.getUnitOfMeasurement(),
                trade.getTradeType(),
                trade.getStatus(),
                trade.getQuantity(),
                trade.getPricePerUnit(),
                trade.getTradeDate()
        );
    }
}
