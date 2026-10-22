package com.ctms.repository;

import com.ctms.dto.TradeAggregateRow;
import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class TradeRepositoryIT {

    @Autowired
    private TestEntityManager entityManager;
    @Autowired
    private TradeRepository tradeRepository;

    private Commodity oil;
    private Commodity gas;
    private Trade t1;
    private Trade t2;
    private Trade t3;
    private Trade t4;

    @BeforeEach
    void setUp() {
        oil = entityManager.persist(commodity("Crude Oil", CommodityType.ENERGY, UnitOfMeasurement.BARREL));
        gas = entityManager.persist(commodity("Natural Gas", CommodityType.ENERGY, UnitOfMeasurement.MMBTU));

        t1 = entityManager.persist(trade("TRD-2026-0001", oil, TradeType.BUY, "100", "10",
                LocalDate.of(2026, 1, 10), TradeStatus.CONFIRMED));
        t4 = entityManager.persist(trade("TRD-2026-0004", oil, TradeType.SELL, "10", "30",
                LocalDate.of(2026, 1, 10), TradeStatus.CONFIRMED));
        t2 = entityManager.persist(trade("TRD-2026-0002", oil, TradeType.SELL, "40", "12",
                LocalDate.of(2026, 2, 15), TradeStatus.CONFIRMED));
        t3 = entityManager.persist(trade("TRD-2026-0003", gas, TradeType.BUY, "500", "3",
                LocalDate.of(2026, 3, 20), TradeStatus.DRAFT));

        entityManager.flush();
    }

    private static Commodity commodity(String name, CommodityType type, UnitOfMeasurement unit) {
        Commodity commodity = new Commodity();
        commodity.setName(name);
        commodity.setType(type);
        commodity.setUnitOfMeasurement(unit);
        commodity.setActive(true);
        return commodity;
    }

    private static Trade trade(String reference, Commodity commodity, TradeType type, String quantity,
                               String price, LocalDate date, TradeStatus status) {
        Trade trade = new Trade();
        trade.setTradeReference(reference);
        trade.setCommodity(commodity);
        trade.setTradeType(type);
        trade.setQuantity(new BigDecimal(quantity));
        trade.setPricePerUnit(new BigDecimal(price));
        trade.setTradeDate(date);
        trade.setStatus(status);
        return trade;
    }

    private List<Trade> findAll(Specification<Trade> specification) {
        return tradeRepository.findAll(specification, PageRequest.of(0, 100)).getContent();
    }

    @Test
    void filterByCommodityId() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                oil.getId(), null, null, null, null, null));

        assertThat(result).extracting(Trade::getTradeReference)
                .containsExactlyInAnyOrder("TRD-2026-0001", "TRD-2026-0002", "TRD-2026-0004");
    }

    @Test
    void filterByTradeType() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                null, TradeType.BUY, null, null, null, null));

        assertThat(result).extracting(Trade::getTradeReference)
                .containsExactlyInAnyOrder("TRD-2026-0001", "TRD-2026-0003");
    }

    @Test
    void filterByStatus() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                null, null, TradeStatus.DRAFT, null, null, null));

        assertThat(result).extracting(Trade::getTradeReference).containsExactly("TRD-2026-0003");
    }

    @Test
    void filterByDateRange() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                null, null, null, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 31), null));

        assertThat(result).extracting(Trade::getTradeReference)
                .containsExactlyInAnyOrder("TRD-2026-0002", "TRD-2026-0003");
    }

    @Test
    void filterByReferenceSubstringIsCaseInsensitive() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                null, null, null, null, null, "rd-2026-0002"));

        assertThat(result).extracting(Trade::getTradeReference).containsExactly("TRD-2026-0002");
    }

    @Test
    void filterCombiningCommodityAndStatus() {
        List<Trade> result = findAll(TradeSpecifications.withFilters(
                gas.getId(), null, TradeStatus.DRAFT, null, null, null));

        assertThat(result).extracting(Trade::getTradeReference).containsExactly("TRD-2026-0003");
    }

    @Test
    void countAndExistenceHelpers() {
        assertThat(tradeRepository.countByStatus(TradeStatus.CONFIRMED)).isEqualTo(3);
        assertThat(tradeRepository.countByStatus(TradeStatus.DRAFT)).isEqualTo(1);
        assertThat(tradeRepository.countByTradeType(TradeType.BUY)).isEqualTo(2);
        assertThat(tradeRepository.countByTradeType(TradeType.SELL)).isEqualTo(2);

        assertThat(tradeRepository.existsByCommodityId(oil.getId())).isTrue();
        assertThat(tradeRepository.existsByCommodityId(999_999L)).isFalse();

        assertThat(tradeRepository.existsByTradeReferenceIgnoreCase("trd-2026-0001")).isTrue();
        assertThat(tradeRepository.existsByTradeReferenceIgnoreCase("TRD-NOPE")).isFalse();
    }

    @Test
    void findConfirmedTradesOfACommodityIsOrderedByDateThenId() {
        List<Trade> result = tradeRepository.findByCommodityIdAndStatusOrderByTradeDateAscIdAsc(
                oil.getId(), TradeStatus.CONFIRMED);

        assertThat(result).extracting(Trade::getId)
                .containsExactly(t1.getId(), t4.getId(), t2.getId());
    }

    @Test
    void aggregateProjectionReturnsFlatRowsInDateOrder() {
        List<TradeAggregateRow> rows = tradeRepository.fetchTradeAggregateRows();

        assertThat(rows).hasSize(4);

        TradeAggregateRow first = rows.get(0);
        assertThat(first.commodityId()).isEqualTo(oil.getId());
        assertThat(first.commodityName()).isEqualTo("Crude Oil");
        assertThat(first.unitOfMeasurement()).isEqualTo(UnitOfMeasurement.BARREL);
        assertThat(first.tradeType()).isEqualTo(TradeType.BUY);
        assertThat(first.status()).isEqualTo(TradeStatus.CONFIRMED);
        assertThat(first.quantity()).isEqualByComparingTo("100");
        assertThat(first.pricePerUnit()).isEqualByComparingTo("10");
        assertThat(first.tradeDate()).isEqualTo(LocalDate.of(2026, 1, 10));
        assertThat(first.value()).isEqualByComparingTo("1000");

        assertThat(rows).extracting(TradeAggregateRow::tradeDate)
                .containsExactly(
                        LocalDate.of(2026, 1, 10),
                        LocalDate.of(2026, 1, 10),
                        LocalDate.of(2026, 2, 15),
                        LocalDate.of(2026, 3, 20));
    }
}
