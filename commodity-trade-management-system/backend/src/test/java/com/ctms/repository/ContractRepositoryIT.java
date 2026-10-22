package com.ctms.repository;

import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.Contract;
import com.ctms.entity.ContractStatus;
import com.ctms.entity.UnitOfMeasurement;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ContractRepositoryIT {

    @Autowired
    private TestEntityManager entityManager;
    @Autowired
    private ContractRepository contractRepository;

    private Commodity oil;
    private Commodity gas;

    @BeforeEach
    void setUp() {
        oil = entityManager.persist(commodity("Crude Oil", CommodityType.ENERGY, UnitOfMeasurement.BARREL));
        gas = entityManager.persist(commodity("Natural Gas", CommodityType.ENERGY, UnitOfMeasurement.MMBTU));

        entityManager.persist(contract("CTR-2026-0001", oil, ContractStatus.ACTIVE,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 20)));
        entityManager.persist(contract("CTR-2026-0002", oil, ContractStatus.DRAFT,
                LocalDate.of(2026, 1, 2), LocalDate.of(2026, 2, 15)));
        entityManager.persist(contract("CTR-2026-0003", gas, ContractStatus.COMPLETED,
                LocalDate.of(2026, 1, 3), LocalDate.of(2026, 3, 1)));
        entityManager.persist(contract("CTR-2026-0004", gas, ContractStatus.CANCELLED,
                LocalDate.of(2026, 1, 4), LocalDate.of(2026, 1, 25)));

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

    private static Contract contract(String reference, Commodity commodity, ContractStatus status,
                                     LocalDate contractDate, LocalDate deliveryDate) {
        Contract contract = new Contract();
        contract.setContractReference(reference);
        contract.setBuyerName("Buyer Corp");
        contract.setSellerName("Seller Corp");
        contract.setCommodity(commodity);
        contract.setContractQuantity(new BigDecimal("100"));
        contract.setContractPrice(new BigDecimal("50"));
        contract.setContractDate(contractDate);
        contract.setDeliveryDate(deliveryDate);
        contract.setStatus(status);
        return contract;
    }

    @Test
    void findUpcomingDeliveriesFiltersByStatusAndDateRangeAndFetchesCommodity() {
        List<Contract> result = contractRepository.findUpcomingDeliveries(
                List.of(ContractStatus.DRAFT, ContractStatus.ACTIVE),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31));

        assertThat(result).hasSize(1);
        Contract contract = result.get(0);
        assertThat(contract.getContractReference()).isEqualTo("CTR-2026-0001");
        // The commodity association must be fetched by the JOIN FETCH.
        assertThat(contract.getCommodity()).isNotNull();
        assertThat(contract.getCommodity().getName()).isEqualTo("Crude Oil");
    }

    @Test
    void findUpcomingDeliveriesOrdersByDeliveryDate() {
        List<Contract> result = contractRepository.findUpcomingDeliveries(
                List.of(ContractStatus.DRAFT, ContractStatus.ACTIVE, ContractStatus.COMPLETED),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31));

        assertThat(result).extracting(Contract::getContractReference)
                .containsExactly("CTR-2026-0001", "CTR-2026-0002", "CTR-2026-0003");
    }

    @Test
    void countAndExistenceHelpers() {
        assertThat(contractRepository.countByStatus(ContractStatus.ACTIVE)).isEqualTo(1);
        assertThat(contractRepository.countByStatus(ContractStatus.DRAFT)).isEqualTo(1);
        assertThat(contractRepository.countByStatus(ContractStatus.COMPLETED)).isEqualTo(1);
        assertThat(contractRepository.countByStatus(ContractStatus.CANCELLED)).isEqualTo(1);

        assertThat(contractRepository.existsByCommodityId(oil.getId())).isTrue();
        assertThat(contractRepository.existsByCommodityId(999_999L)).isFalse();

        assertThat(contractRepository.countByContractReferenceStartingWith("CTR-2026-")).isEqualTo(4);
        assertThat(contractRepository.countByContractReferenceStartingWith("NOPE-")).isZero();
    }
}
