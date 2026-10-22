package com.ctms.service;

import com.ctms.dto.DashboardSummaryResponse;
import com.ctms.dto.PnlBreakdownResponse;
import com.ctms.dto.PnlItemResponse;
import com.ctms.dto.TradeActivityResponse;
import com.ctms.dto.TradeAggregateRow;
import com.ctms.dto.TradeVolumeResponse;
import com.ctms.entity.ContractStatus;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import com.ctms.util.Numbers;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds every dashboard and report metric from the live database.
 *
 * <p>Nothing is cached or hardcoded: each call reads the trades and contracts
 * and aggregates them. Grouping is done in Java from a single flat projection
 * ({@link TradeAggregateRow}) so the same logic runs on MySQL and H2 and can be
 * unit tested without a database.</p>
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int UPCOMING_DELIVERY_WINDOW_DAYS = 30;
    private static final int DEFAULT_ACTIVITY_MONTHS = 6;
    private static final int MAX_ACTIVITY_MONTHS = 36;

    private final TradeRepository tradeRepository;
    private final CommodityRepository commodityRepository;
    private final ContractRepository contractRepository;

    public DashboardService(TradeRepository tradeRepository,
                            CommodityRepository commodityRepository,
                            ContractRepository contractRepository) {
        this.tradeRepository = tradeRepository;
        this.commodityRepository = commodityRepository;
        this.contractRepository = contractRepository;
    }

    /** Summary cards of the dashboard. */
    public DashboardSummaryResponse summary() {
        List<TradeAggregateRow> rows = tradeRepository.fetchTradeAggregateRows();
        List<TradeAggregateRow> activeRows = rows.stream()
                .filter(row -> row.status() != TradeStatus.CANCELLED)
                .toList();

        long totalTrades = rows.size();
        long draftTrades = countByStatus(rows, TradeStatus.DRAFT);
        long confirmedTrades = countByStatus(rows, TradeStatus.CONFIRMED);
        long cancelledTrades = countByStatus(rows, TradeStatus.CANCELLED);

        long buyTrades = activeRows.stream().filter(row -> row.tradeType() == TradeType.BUY).count();
        long sellTrades = activeRows.stream().filter(row -> row.tradeType() == TradeType.SELL).count();

        BigDecimal totalVolume = activeRows.stream()
                .map(TradeAggregateRow::safeQuantity)
                .reduce(Numbers.zero(), BigDecimal::add);
        BigDecimal totalValue = activeRows.stream()
                .map(TradeAggregateRow::value)
                .reduce(Numbers.zero(), BigDecimal::add);

        PnlBreakdownResponse pnl = buildPnlBreakdown(rows);

        return new DashboardSummaryResponse(
                totalTrades,
                draftTrades,
                confirmedTrades,
                cancelledTrades,
                buyTrades,
                sellTrades,
                Numbers.scaledOrZero(totalVolume),
                Numbers.scaledOrZero(totalValue),
                pnl.realizedPnlAvailable() ? pnl.totalRealizedPnl() : null,
                pnl.realizedPnlAvailable(),
                null,
                false,
                pnl.realizedPnlAvailable()
                        ? "Realized P&L is matched per commodity and unit of measurement using a FIFO cost basis. "
                          + "Unrealized P&L is not available because no market prices are stored."
                        : "Realized P&L is not available: no confirmed buy and sell quantities could be matched.",
                PnlService.PNL_DISCLAIMER,
                commodityRepository.count(),
                commodityRepository.countByActiveTrue(),
                contractRepository.countByStatus(ContractStatus.ACTIVE),
                countUpcomingDeliveries(),
                UPCOMING_DELIVERY_WINDOW_DAYS
        );
    }

    /** Trade volume (and value) grouped by commodity. */
    public List<TradeVolumeResponse> tradeVolume() {
        Map<Long, VolumeAccumulator> grouped = new LinkedHashMap<>();
        for (TradeAggregateRow row : tradeRepository.fetchTradeAggregateRows()) {
            if (row.status() == TradeStatus.CANCELLED) {
                continue;
            }
            VolumeAccumulator accumulator = grouped.computeIfAbsent(row.commodityId(),
                    id -> new VolumeAccumulator(row.commodityId(), row.commodityName(), row.unitOfMeasurement()));
            accumulator.accept(row);
        }
        return grouped.values().stream().map(VolumeAccumulator::toResponse).toList();
    }

    /**
     * Trade activity per calendar month for the last {@code months} months.
     * Months without trades are included with zeros so the chart is continuous.
     */
    public List<TradeActivityResponse> tradeActivity(Integer months) {
        int window = months == null || months <= 0
                ? DEFAULT_ACTIVITY_MONTHS
                : Math.min(months, MAX_ACTIVITY_MONTHS);

        YearMonth firstMonth = YearMonth.now().minusMonths(window - 1L);
        Map<YearMonth, ActivityAccumulator> grouped = new LinkedHashMap<>();
        for (int i = 0; i < window; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            grouped.put(month, new ActivityAccumulator(month));
        }

        LocalDate from = firstMonth.atDay(1);
        for (TradeAggregateRow row : tradeRepository.fetchTradeAggregateRows()) {
            if (row.status() == TradeStatus.CANCELLED || row.tradeDate() == null) {
                continue;
            }
            if (row.tradeDate().isBefore(from)) {
                continue;
            }
            YearMonth month = YearMonth.from(row.tradeDate());
            ActivityAccumulator accumulator = grouped.get(month);
            if (accumulator != null) {
                accumulator.accept(row);
            }
        }

        List<TradeActivityResponse> result = new ArrayList<>();
        grouped.values().forEach(accumulator -> result.add(accumulator.toResponse()));
        return result;
    }

    /** Realized P&L per commodity plus the portfolio total. */
    public PnlBreakdownResponse pnlBreakdown() {
        return buildPnlBreakdown(tradeRepository.fetchTradeAggregateRows());
    }

    private PnlBreakdownResponse buildPnlBreakdown(List<TradeAggregateRow> rows) {
        Map<Long, List<TradeAggregateRow>> byCommodity = new LinkedHashMap<>();
        for (TradeAggregateRow row : rows) {
            byCommodity.computeIfAbsent(row.commodityId(), id -> new ArrayList<>()).add(row);
        }

        List<PnlItemResponse> items = new ArrayList<>();
        BigDecimal total = Numbers.zero();
        boolean anyAvailable = false;

        for (Map.Entry<Long, List<TradeAggregateRow>> entry : byCommodity.entrySet()) {
            List<TradeAggregateRow> commodityRows = entry.getValue();
            TradeAggregateRow sample = commodityRows.get(0);
            PnlResult result = PnlService.match(
                    sample.commodityName(),
                    sample.unitOfMeasurement(),
                    commodityRows.stream()
                            .filter(row -> row.status() == TradeStatus.CONFIRMED)
                            .map(row -> new PnlService.PositionEntry(
                                    row.tradeType(), row.safeQuantity(), Numbers.orZero(row.pricePerUnit())))
                            .toList());

            if (result.realizedPnlAvailable()) {
                anyAvailable = true;
                total = total.add(result.realizedPnl());
            }

            items.add(new PnlItemResponse(
                    entry.getKey(),
                    sample.commodityName(),
                    sample.unitOfMeasurement(),
                    result.buyQuantity(),
                    result.sellQuantity(),
                    result.matchedQuantity(),
                    result.openBuyQuantity(),
                    result.openSellQuantity(),
                    result.realizedPnl(),
                    result.realizedPnlAvailable(),
                    result.message()
            ));
        }

        return new PnlBreakdownResponse(
                items,
                anyAvailable ? Numbers.toScale(total) : null,
                anyAvailable,
                PnlService.COST_BASIS_METHOD,
                PnlService.PNL_DISCLAIMER
        );
    }

    private long countUpcomingDeliveries() {
        LocalDate today = LocalDate.now();
        return contractRepository.findUpcomingDeliveries(
                        List.of(ContractStatus.DRAFT, ContractStatus.ACTIVE),
                        today,
                        today.plusDays(UPCOMING_DELIVERY_WINDOW_DAYS))
                .size();
    }

    private long countByStatus(List<TradeAggregateRow> rows, TradeStatus status) {
        return rows.stream().filter(row -> row.status() == status).count();
    }

    /** Mutable helper that accumulates the volume metrics of one commodity. */
    private static final class VolumeAccumulator {
        private final Long commodityId;
        private final String commodityName;
        private final UnitOfMeasurement unit;
        private long tradeCount;
        private BigDecimal buyQuantity = Numbers.zero();
        private BigDecimal sellQuantity = Numbers.zero();
        private BigDecimal totalValue = Numbers.zero();

        private VolumeAccumulator(Long commodityId, String commodityName, UnitOfMeasurement unit) {
            this.commodityId = commodityId;
            this.commodityName = commodityName;
            this.unit = unit;
        }

        private void accept(TradeAggregateRow row) {
            tradeCount++;
            if (row.tradeType() == TradeType.BUY) {
                buyQuantity = buyQuantity.add(row.safeQuantity());
            } else {
                sellQuantity = sellQuantity.add(row.safeQuantity());
            }
            totalValue = totalValue.add(row.value());
        }

        private TradeVolumeResponse toResponse() {
            return new TradeVolumeResponse(
                    commodityId,
                    commodityName,
                    unit,
                    tradeCount,
                    Numbers.toScale(buyQuantity),
                    Numbers.toScale(sellQuantity),
                    Numbers.toScale(buyQuantity.add(sellQuantity)),
                    Numbers.toScale(totalValue)
            );
        }
    }

    /** Mutable helper that accumulates the monthly activity of one month. */
    private static final class ActivityAccumulator {
        private final YearMonth month;
        private long tradeCount;
        private long buyCount;
        private long sellCount;
        private BigDecimal buyValue = Numbers.zero();
        private BigDecimal sellValue = Numbers.zero();
        private BigDecimal totalQuantity = Numbers.zero();

        private ActivityAccumulator(YearMonth month) {
            this.month = month;
        }

        private void accept(TradeAggregateRow row) {
            tradeCount++;
            totalQuantity = totalQuantity.add(row.safeQuantity());
            if (row.tradeType() == TradeType.BUY) {
                buyCount++;
                buyValue = buyValue.add(row.value());
            } else {
                sellCount++;
                sellValue = sellValue.add(row.value());
            }
        }

        private TradeActivityResponse toResponse() {
            return new TradeActivityResponse(
                    month.toString(),
                    month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + month.getYear(),
                    tradeCount,
                    buyCount,
                    sellCount,
                    Numbers.toScale(buyValue),
                    Numbers.toScale(sellValue),
                    Numbers.toScale(buyValue.add(sellValue)),
                    Numbers.toScale(totalQuantity)
            );
        }
    }
}
