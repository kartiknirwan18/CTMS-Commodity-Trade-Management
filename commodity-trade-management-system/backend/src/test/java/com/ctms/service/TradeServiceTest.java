package com.ctms.service;

import com.ctms.dto.PnlResponse;
import com.ctms.dto.TradeRequest;
import com.ctms.dto.TradeResponse;
import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.Contract;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.exception.BusinessRuleException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

    @Mock
    private TradeRepository tradeRepository;
    @Mock
    private CommodityRepository commodityRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ReferenceGenerator referenceGenerator;
    @Mock
    private PnlService pnlService;

    @InjectMocks
    private TradeService tradeService;

    private static Commodity commodity(long id, boolean active) {
        Commodity commodity = new Commodity();
        commodity.setId(id);
        commodity.setName("Crude Oil");
        commodity.setType(CommodityType.ENERGY);
        commodity.setUnitOfMeasurement(UnitOfMeasurement.BARREL);
        commodity.setActive(active);
        return commodity;
    }

    private static Contract contract(long id, String reference, Commodity commodity) {
        Contract contract = new Contract();
        contract.setId(id);
        contract.setContractReference(reference);
        contract.setCommodity(commodity);
        return contract;
    }

    private static Trade trade(long id, String reference, TradeStatus status, Commodity commodity) {
        Trade trade = new Trade();
        trade.setId(id);
        trade.setTradeReference(reference);
        trade.setStatus(status);
        trade.setCommodity(commodity);
        trade.setTradeType(TradeType.BUY);
        trade.setQuantity(new BigDecimal("100.0000"));
        trade.setPricePerUnit(new BigDecimal("10.0000"));
        trade.setTradeDate(LocalDate.of(2026, 1, 15));
        return trade;
    }

    private static TradeRequest request(String reference, Long commodityId, Long contractId) {
        return new TradeRequest(
                reference,
                commodityId,
                TradeType.BUY,
                new BigDecimal("100.0000"),
                new BigDecimal("10.0000"),
                LocalDate.of(2026, 1, 15),
                "Glencore",
                contractId,
                null);
    }

    @Test
    void createGeneratesReferenceAndDefaultsStatusToDraft() {
        Commodity commodity = commodity(1L, true);
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(referenceGenerator.nextTradeReference()).thenReturn("TRD-2026-0001");
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TradeResponse response = tradeService.create(request(null, 1L, null));

        assertThat(response.tradeReference()).isEqualTo("TRD-2026-0001");
        assertThat(response.status()).isEqualTo(TradeStatus.DRAFT);
        assertThat(response.commodityId()).isEqualTo(1L);
        assertThat(response.quantity()).isEqualByComparingTo("100");
        assertThat(response.pricePerUnit()).isEqualByComparingTo("10");
        assertThat(response.totalValue()).isEqualByComparingTo("1000");
    }

    @Test
    void createKeepsTheClientSuppliedReference() {
        Commodity commodity = commodity(1L, true);
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(tradeRepository.existsByTradeReferenceIgnoreCase("TRD-CUSTOM")).thenReturn(false);
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TradeResponse response = tradeService.create(request("TRD-CUSTOM", 1L, null));

        assertThat(response.tradeReference()).isEqualTo("TRD-CUSTOM");
        verify(referenceGenerator, never()).nextTradeReference();
    }

    @Test
    void createWithInactiveCommodityIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, false)));

        assertThatThrownBy(() -> tradeService.create(request(null, 1L, null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("inactive");
        verify(tradeRepository, never()).save(any(Trade.class));
    }

    @Test
    void createWithUnknownCommodityIsRejected() {
        when(commodityRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tradeService.create(request(null, 99L, null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Commodity");
    }

    @Test
    void createWithDuplicateReferenceIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, true)));
        when(tradeRepository.existsByTradeReferenceIgnoreCase("TRD-DUP")).thenReturn(true);

        assertThatThrownBy(() -> tradeService.create(request("TRD-DUP", 1L, null)))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("TRD-DUP");
    }

    @Test
    void createWithContractOfADifferentCommodityIsRejected() {
        Commodity tradeCommodity = commodity(1L, true);
        Commodity otherCommodity = commodity(2L, true);
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(tradeCommodity));
        when(contractRepository.findById(7L))
                .thenReturn(Optional.of(contract(7L, "CTR-2026-0007", otherCommodity)));

        assertThatThrownBy(() -> tradeService.create(request(null, 1L, 7L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void createWithUnknownContractIsRejected() {
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity(1L, true)));
        when(contractRepository.findById(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tradeService.create(request(null, 1L, 7L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Contract");
    }

    @Test
    void createWithMatchingContractIsAccepted() {
        Commodity commodity = commodity(1L, true);
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(contractRepository.findById(7L))
                .thenReturn(Optional.of(contract(7L, "CTR-2026-0007", commodity)));
        when(referenceGenerator.nextTradeReference()).thenReturn("TRD-2026-0002");
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TradeResponse response = tradeService.create(request(null, 1L, 7L));

        assertThat(response.contractId()).isEqualTo(7L);
        assertThat(response.contractReference()).isEqualTo("CTR-2026-0007");
    }

    @Test
    void updateOfACancelledTradeIsRejectedAndNeverSaved() {
        Trade cancelled = trade(10L, "TRD-2026-0010", TradeStatus.CANCELLED, commodity(1L, true));
        when(tradeRepository.findById(10L)).thenReturn(Optional.of(cancelled));

        assertThatThrownBy(() -> tradeService.update(10L, request(null, 1L, null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cancelled");
        verify(tradeRepository, never()).save(any(Trade.class));
    }

    @Test
    void updateStatusToCancelledFromConfirmedWorks() {
        Trade confirmed = trade(10L, "TRD-2026-0010", TradeStatus.CONFIRMED, commodity(1L, true));
        when(tradeRepository.findById(10L)).thenReturn(Optional.of(confirmed));
        when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TradeResponse response = tradeService.updateStatus(10L, TradeStatus.CANCELLED);

        assertThat(response.status()).isEqualTo(TradeStatus.CANCELLED);
        verify(tradeRepository).save(confirmed);
    }

    @Test
    void updateStatusOfACancelledTradeCannotReopen() {
        Trade cancelled = trade(10L, "TRD-2026-0010", TradeStatus.CANCELLED, commodity(1L, true));
        when(tradeRepository.findById(10L)).thenReturn(Optional.of(cancelled));

        assertThatThrownBy(() -> tradeService.updateStatus(10L, TradeStatus.CONFIRMED))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cannot be reopened");
        verify(tradeRepository, never()).save(any(Trade.class));
    }

    @Test
    void updateStatusToTheSameStatusIsANoOp() {
        Trade confirmed = trade(10L, "TRD-2026-0010", TradeStatus.CONFIRMED, commodity(1L, true));
        when(tradeRepository.findById(10L)).thenReturn(Optional.of(confirmed));

        TradeResponse response = tradeService.updateStatus(10L, TradeStatus.CONFIRMED);

        assertThat(response.status()).isEqualTo(TradeStatus.CONFIRMED);
        verify(tradeRepository, never()).save(any(Trade.class));
    }

    @Test
    void findByIdWithUnknownIdIsRejected() {
        when(tradeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tradeService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Trade");
    }

    @Test
    void findByIdMapsTheTrade() {
        when(tradeRepository.findById(10L))
                .thenReturn(Optional.of(trade(10L, "TRD-2026-0010", TradeStatus.DRAFT, commodity(1L, true))));

        TradeResponse response = tradeService.findById(10L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.tradeReference()).isEqualTo("TRD-2026-0010");
        assertThat(response.commodityName()).isEqualTo("Crude Oil");
    }

    @Test
    void pnlDelegatesToThePnlService() {
        PnlResponse pnlResponse = mock(PnlResponse.class);
        when(pnlService.pnlForTrade(10L)).thenReturn(pnlResponse);

        assertThat(tradeService.pnl(10L)).isSameAs(pnlResponse);
        verify(pnlService).pnlForTrade(10L);
    }
}
