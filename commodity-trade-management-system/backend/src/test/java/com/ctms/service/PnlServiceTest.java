package com.ctms.service;

import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit tests for the static FIFO matcher of {@link PnlService}. No Spring
 * context and no mocks are involved.
 */
class PnlServiceTest {

    private static final UnitOfMeasurement UNIT = UnitOfMeasurement.BARREL;

    private static PnlService.PositionEntry buy(String quantity, String price) {
        return new PnlService.PositionEntry(TradeType.BUY, new BigDecimal(quantity), new BigDecimal(price));
    }

    private static PnlService.PositionEntry sell(String quantity, String price) {
        return new PnlService.PositionEntry(TradeType.SELL, new BigDecimal(quantity), new BigDecimal(price));
    }

    @Test
    void exactFullMatchOfOneBuyAndOneSell() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("100", "10"),
                sell("100", "12")));

        assertThat(result.buyQuantity()).isEqualByComparingTo("100");
        assertThat(result.sellQuantity()).isEqualByComparingTo("100");
        assertThat(result.matchedQuantity()).isEqualByComparingTo("100");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("0");
        assertThat(result.openSellQuantity()).isEqualByComparingTo("0");
        assertThat(result.realizedPnl()).isEqualByComparingTo("200");
        assertThat(result.realizedPnlAvailable()).isTrue();
        assertThat(result.message()).isNotBlank();
    }

    @Test
    void partialMatchLeavesOpenBuyPosition() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("100", "10"),
                sell("40", "12")));

        assertThat(result.matchedQuantity()).isEqualByComparingTo("40");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("60");
        assertThat(result.openSellQuantity()).isEqualByComparingTo("0");
        assertThat(result.realizedPnl()).isEqualByComparingTo("80");
        assertThat(result.realizedPnlAvailable()).isTrue();
    }

    @Test
    void fifoConsumesOldestBuyLotFirst() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("10", "10"),
                buy("10", "20"),
                sell("15", "30")));

        // 10 matched against the 10 @10 lot: 10 * (30 - 10) = 200
        //  5 matched against the 10 @20 lot:  5 * (30 - 20) =  50
        assertThat(result.matchedQuantity()).isEqualByComparingTo("15");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("5");
        assertThat(result.realizedPnl()).isEqualByComparingTo("250");
        assertThat(result.realizedPnlAvailable()).isTrue();
    }

    @Test
    void onlyBuyEntriesMeansNoRealizedPnl() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("100", "10"),
                buy("50", "11")));

        assertThat(result.buyQuantity()).isEqualByComparingTo("150");
        assertThat(result.sellQuantity()).isEqualByComparingTo("0");
        assertThat(result.matchedQuantity()).isEqualByComparingTo("0");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("150");
        assertThat(result.realizedPnl()).isNull();
        assertThat(result.realizedPnlAvailable()).isFalse();
        assertThat(result.message()).isNotBlank();
    }

    @Test
    void sellLargerThanAllBuysLeavesOpenSellPosition() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("10", "10"),
                sell("25", "15")));

        assertThat(result.matchedQuantity()).isEqualByComparingTo("10");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("0");
        assertThat(result.openSellQuantity()).isEqualByComparingTo("15");
        assertThat(result.realizedPnl()).isEqualByComparingTo("50");
        assertThat(result.realizedPnlAvailable()).isTrue();
    }

    @Test
    void sellBeforeAnyBuyIsAnOpenShortPosition() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                sell("30", "20")));

        assertThat(result.buyQuantity()).isEqualByComparingTo("0");
        assertThat(result.sellQuantity()).isEqualByComparingTo("30");
        assertThat(result.matchedQuantity()).isEqualByComparingTo("0");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("0");
        assertThat(result.openSellQuantity()).isEqualByComparingTo("30");
        assertThat(result.realizedPnl()).isNull();
        assertThat(result.realizedPnlAvailable()).isFalse();
    }

    @Test
    void emptyEntryListProducesZeroQuantitiesAndUnavailablePnl() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of());

        assertThat(result.buyQuantity()).isEqualByComparingTo("0");
        assertThat(result.sellQuantity()).isEqualByComparingTo("0");
        assertThat(result.matchedQuantity()).isEqualByComparingTo("0");
        assertThat(result.openBuyQuantity()).isEqualByComparingTo("0");
        assertThat(result.openSellQuantity()).isEqualByComparingTo("0");
        assertThat(result.realizedPnl()).isNull();
        assertThat(result.realizedPnlAvailable()).isFalse();
        assertThat(result.message()).isNotBlank();
    }

    @Test
    void returnedDecimalsUseScaleFour() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                buy("100", "10"),
                sell("100", "12")));

        assertThat(result.buyQuantity().scale()).isEqualTo(4);
        assertThat(result.sellQuantity().scale()).isEqualTo(4);
        assertThat(result.matchedQuantity().scale()).isEqualTo(4);
        assertThat(result.openBuyQuantity().scale()).isEqualTo(4);
        assertThat(result.openSellQuantity().scale()).isEqualTo(4);
        assertThat(result.realizedPnl().scale()).isEqualTo(4);
    }

    @Test
    void nullPriceIsTreatedAsZero() {
        PnlResult result = PnlService.match("Crude Oil", UNIT, List.of(
                new PnlService.PositionEntry(TradeType.BUY, new BigDecimal("10"), null),
                sell("10", "5")));

        assertThat(result.matchedQuantity()).isEqualByComparingTo("10");
        assertThat(result.realizedPnl()).isEqualByComparingTo("50");
    }

    @Test
    void constantsAreExposedAsDocumented() {
        assertThat(PnlService.COST_BASIS_METHOD).isEqualTo("FIFO");
        assertThat(PnlService.PNL_DISCLAIMER).isNotBlank();
    }
}
