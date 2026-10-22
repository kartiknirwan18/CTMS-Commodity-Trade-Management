package com.ctms.config;

import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.Contract;
import com.ctms.entity.ContractStatus;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Inserts a small, realistic sample data set when the application starts with
 * {@code ctms.demo-data.enabled=true} (the "h2" profile).
 *
 * <p>It only runs when the tables are empty, so it never overwrites real data.
 * For MySQL the same data is available as a SQL script in
 * {@code database/seed-data.sql}.</p>
 */
@Component
@ConditionalOnProperty(prefix = "ctms.demo-data", name = "enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final CommodityRepository commodityRepository;
    private final TradeRepository tradeRepository;
    private final ContractRepository contractRepository;

    public DemoDataSeeder(CommodityRepository commodityRepository,
                          TradeRepository tradeRepository,
                          ContractRepository contractRepository) {
        this.commodityRepository = commodityRepository;
        this.tradeRepository = tradeRepository;
        this.contractRepository = contractRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (commodityRepository.count() > 0 || tradeRepository.count() > 0) {
            log.info("Demo data skipped: the database already contains data");
            return;
        }

        LocalDate today = LocalDate.now();
        int year = today.getYear();

        Commodity crudeOil = commodity("Crude Oil", CommodityType.ENERGY, UnitOfMeasurement.BARREL,
                "Light sweet crude oil, WTI grade", true);
        Commodity naturalGas = commodity("Natural Gas", CommodityType.ENERGY, UnitOfMeasurement.MMBTU,
                "Henry Hub natural gas", true);
        Commodity wheat = commodity("Wheat", CommodityType.AGRICULTURE, UnitOfMeasurement.METRIC_TON,
                "Milling wheat, delivered Europe", true);
        Commodity corn = commodity("Corn", CommodityType.AGRICULTURE, UnitOfMeasurement.BUSHEL,
                "Yellow corn #2", true);
        Commodity copper = commodity("Copper", CommodityType.METALS, UnitOfMeasurement.METRIC_TON,
                "Grade A copper cathode", true);
        commodity("Coffee", CommodityType.AGRICULTURE, UnitOfMeasurement.POUND,
                "Arabica coffee beans - temporarily suspended", false);
        commodityRepository.saveAll(List.of(crudeOil, naturalGas, wheat, corn, copper));

        int tradeSequence = 1;
        List<Trade> trades = new ArrayList<>();

        // Crude Oil: fully matched position -> realized P&L is available.
        trades.add(trade(crudeOil, TradeType.BUY, "1000", "76.50", today.minusDays(120), "Glencore", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(crudeOil, TradeType.BUY, "800", "79.25", today.minusDays(75), "Vitol", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(crudeOil, TradeType.SELL, "1200", "82.40", today.minusDays(40), "Trafigura", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(crudeOil, TradeType.SELL, "300", "84.10", today.minusDays(12), "Shell Trading", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(crudeOil, TradeType.BUY, "500", "81.00", today.minusDays(5), "Gunvor", TradeStatus.DRAFT, year, tradeSequence++));

        // Natural Gas: partly matched.
        trades.add(trade(naturalGas, TradeType.BUY, "25000", "2.85", today.minusDays(95), "Cheniere", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(naturalGas, TradeType.SELL, "10000", "3.20", today.minusDays(30), "Uniper", TradeStatus.CONFIRMED, year, tradeSequence++));

        // Wheat: matched with a loss.
        trades.add(trade(wheat, TradeType.BUY, "1500", "245.00", today.minusDays(110), "Cargill", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(wheat, TradeType.SELL, "1500", "238.75", today.minusDays(45), "Louis Dreyfus", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(wheat, TradeType.BUY, "600", "251.50", today.minusDays(20), "ADM", TradeStatus.CANCELLED, year, tradeSequence++));

        // Corn: only buys -> P&L not available.
        trades.add(trade(corn, TradeType.BUY, "40000", "5.42", today.minusDays(85), "Bunge", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(corn, TradeType.BUY, "15000", "5.18", today.minusDays(25), "Cargill", TradeStatus.CONFIRMED, year, tradeSequence++));

        // Copper: sells exceed buys -> open short position.
        trades.add(trade(copper, TradeType.BUY, "120", "8450.00", today.minusDays(70), "Trafigura", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(copper, TradeType.SELL, "200", "8720.00", today.minusDays(18), "Glencore", TradeStatus.CONFIRMED, year, tradeSequence++));
        trades.add(trade(copper, TradeType.SELL, "50", "8890.00", today.minusDays(7), "IXM", TradeStatus.DRAFT, year, tradeSequence++));

        tradeRepository.saveAll(trades);

        Contract contract1 = contract("CTR", year, 1, "Vitol", "Trafigura", crudeOil, "5000", "76.25",
                today.minusDays(20), today.plusDays(5), "Rotterdam", ContractStatus.ACTIVE);
        Contract contract2 = contract("CTR", year, 2, "Uniper", "Cheniere", naturalGas, "30000", "2.95",
                today.minusDays(35), today.plusDays(12), "Zeebrugge", ContractStatus.ACTIVE);
        Contract contract3 = contract("CTR", year, 3, "Louis Dreyfus", "Cargill", wheat, "2000", "242.00",
                today.minusDays(60), today.plusDays(25), "Rouen", ContractStatus.ACTIVE);
        Contract contract4 = contract("CTR", year, 4, "Bunge", "ADM", corn, "25000", "5.55",
                today.minusDays(50), today.minusDays(3), "Chicago", ContractStatus.COMPLETED);
        Contract contract5 = contract("CTR", year, 5, "IXM", "Glencore", copper, "150", "8600.00",
                today.minusDays(15), today.plusDays(45), "Antwerp", ContractStatus.DRAFT);
        Contract contract6 = contract("CTR", year, 6, "Shell Trading", "Gunvor", crudeOil, "1000", "80.50",
                today.minusDays(10), today.minusDays(2), "Houston", ContractStatus.CANCELLED);
        contractRepository.saveAll(List.of(contract1, contract2, contract3, contract4, contract5, contract6));

        // Link a couple of contracts with the trades that fulfil them.
        trades.get(2).setContract(contract1);
        trades.get(6).setContract(contract2);
        trades.get(8).setContract(contract3);
        contract1.setLinkedTrade(trades.get(2));
        contract2.setLinkedTrade(trades.get(6));
        contract3.setLinkedTrade(trades.get(8));
        tradeRepository.saveAll(trades);
        contractRepository.saveAll(List.of(contract1, contract2, contract3));

        log.info("Demo data inserted: {} commodities, {} trades, 6 contracts",
                commodityRepository.count(), tradeRepository.count());
    }

    private Commodity commodity(String name, CommodityType type, UnitOfMeasurement unit,
                                String description, boolean active) {
        Commodity commodity = new Commodity();
        commodity.setName(name);
        commodity.setType(type);
        commodity.setUnitOfMeasurement(unit);
        commodity.setDescription(description);
        commodity.setActive(active);
        return commodity;
    }

    private Trade trade(Commodity commodity, TradeType type, String quantity, String price, LocalDate date,
                        String counterparty, TradeStatus status, int year, int sequence) {
        Trade trade = new Trade();
        trade.setTradeReference("TRD-" + year + "-" + String.format("%04d", sequence));
        trade.setCommodity(commodity);
        trade.setTradeType(type);
        trade.setQuantity(new BigDecimal(quantity));
        trade.setPricePerUnit(new BigDecimal(price));
        trade.setTradeDate(date);
        trade.setCounterparty(counterparty);
        trade.setStatus(status);
        return trade;
    }

    private Contract contract(String prefix, int year, int sequence, String buyer, String seller,
                              Commodity commodity, String quantity, String price, LocalDate contractDate,
                              LocalDate deliveryDate, String location, ContractStatus status) {
        Contract contract = new Contract();
        contract.setContractReference(prefix + "-" + year + "-" + String.format("%04d", sequence));
        contract.setBuyerName(buyer);
        contract.setSellerName(seller);
        contract.setCommodity(commodity);
        contract.setContractQuantity(new BigDecimal(quantity));
        contract.setContractPrice(new BigDecimal(price));
        contract.setContractDate(contractDate);
        contract.setDeliveryDate(deliveryDate);
        contract.setDeliveryLocation(location);
        contract.setStatus(status);
        return contract;
    }
}
