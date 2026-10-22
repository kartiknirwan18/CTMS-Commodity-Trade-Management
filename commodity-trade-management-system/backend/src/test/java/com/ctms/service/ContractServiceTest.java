package com.ctms.service;

import com.ctms.dto.ContractRequest;
import com.ctms.dto.ContractResponse;
import com.ctms.dto.UpcomingDeliveryResponse;
import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.ContractStatus;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.exception.BusinessRuleException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock
    private ContractRepository contractRepository;
    @Mock
    private CommodityRepository commodityRepository;
    @Mock
    private TradeRepository tradeRepository;
    @Mock
    private ReferenceGenerator referenceGenerator;

    @InjectMocks
    private ContractService contractService;

    private static Commodity commodity(long id, boolean active) {
        Commodity commodity = new Commodity();
        commodity.setId(id);
        commodity.setName("Crude Oil");
        commodity.setType(CommodityType.ENERGY);
        commodity.setUnitOfMeasurement(UnitOfMeasurement.BARREL);
        commodity.setActive(active);
        return commodity;
    }

    private static ContractRequest request(String reference,
                                           String buyer,
                                           String seller,
                                           Long commodityId,
                                           LocalDate contractDate,
                                           LocalDate deliveryDate) {
        return new ContractRequest(
                reference,
                buyer,
                seller,
                commodityId,
                new BigDecimal("100.0000"),
                new BigDecimal("50.0000"),
                contractDate,
                deliveryDate,
                "Rotterdam",
                ContractStatus.DRAFT,
                null);
    }

    @Test
    void createWithDeliveryDateBeforeContractDateIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, true)));

        ContractRequest request = request("CTR-A", "Buyer Corp", "Seller Corp", 1L,
                LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 1));

        assertThatThrownBy(() -> contractService.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Delivery date");
    }

    @Test
    void createWithIdenticalBuyerAndSellerIsRejectedCaseInsensitively() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, true)));

        ContractRequest request = request("CTR-A", "ACME Trading", "acme trading", 1L,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1));

        assertThatThrownBy(() -> contractService.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Buyer and seller");
    }

    @Test
    void createWithUnknownCommodityIsRejected() {
        when(commodityRepository.findById(42L)).thenReturn(Optional.empty());

        ContractRequest request = request("CTR-A", "Buyer Corp", "Seller Corp", 42L,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1));

        assertThatThrownBy(() -> contractService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Commodity");
    }

    @Test
    void createWithInactiveCommodityIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, false)));

        ContractRequest request = request("CTR-A", "Buyer Corp", "Seller Corp", 1L,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1));

        assertThatThrownBy(() -> contractService.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void createWithDuplicateReferenceIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, true)));
        when(contractRepository.existsByContractReferenceIgnoreCase("CTR-DUP")).thenReturn(true);

        ContractRequest request = request("CTR-DUP", "Buyer Corp", "Seller Corp", 1L,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1));

        assertThatThrownBy(() -> contractService.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("CTR-DUP");
    }

    @Test
    void createWithValidRequestIsMapped() {
        Commodity commodity = commodity(1L, true);
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(referenceGenerator.nextContractReference()).thenReturn("CTR-2026-0001");
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ContractRequest request = request(null, "Buyer Corp", "Seller Corp", 1L,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1));

        ContractResponse response = contractService.create(request);

        assertThat(response.contractReference()).isEqualTo("CTR-2026-0001");
        assertThat(response.status()).isEqualTo(ContractStatus.DRAFT);
        assertThat(response.contractValue()).isEqualByComparingTo("5000");
    }

    @Test
    void upcomingDeliveriesWithNullDaysUsesTheDefaultWindow() {
        when(contractRepository.findUpcomingDeliveries(anyList(), any(), any())).thenReturn(List.of());

        List<UpcomingDeliveryResponse> result = contractService.upcomingDeliveries(null);

        assertThat(result).isEmpty();
        assertWindow(30L);
    }

    @Test
    void upcomingDeliveriesWithZeroDaysUsesTheDefaultWindow() {
        when(contractRepository.findUpcomingDeliveries(anyList(), any(), any())).thenReturn(List.of());

        contractService.upcomingDeliveries(0);

        assertWindow(30L);
    }

    @Test
    void upcomingDeliveriesWithNegativeDaysUsesTheDefaultWindow() {
        when(contractRepository.findUpcomingDeliveries(anyList(), any(), any())).thenReturn(List.of());

        contractService.upcomingDeliveries(-5);

        assertWindow(30L);
    }

    @Test
    void upcomingDeliveriesAboveMaximumIsClamped() {
        when(contractRepository.findUpcomingDeliveries(anyList(), any(), any())).thenReturn(List.of());

        contractService.upcomingDeliveries(1000);

        assertWindow(365L);
    }

    @SuppressWarnings("unchecked")
    private void assertWindow(long expectedDays) {
        ArgumentCaptor<Collection<ContractStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
        ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> to = ArgumentCaptor.forClass(LocalDate.class);
        verify(contractRepository).findUpcomingDeliveries(statuses.capture(), from.capture(), to.capture());

        assertThat(statuses.getValue()).containsExactlyInAnyOrder(ContractStatus.DRAFT, ContractStatus.ACTIVE);
        assertThat(ChronoUnit.DAYS.between(from.getValue(), to.getValue())).isEqualTo(expectedDays);
        assertThat(from.getValue()).isEqualTo(LocalDate.now());
    }
}
