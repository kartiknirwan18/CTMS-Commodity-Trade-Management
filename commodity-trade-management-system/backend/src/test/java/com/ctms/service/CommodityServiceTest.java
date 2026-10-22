package com.ctms.service;

import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.exception.ConflictException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.dto.CommodityRequest;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommodityServiceTest {

    @Mock
    private CommodityRepository commodityRepository;
    @Mock
    private TradeRepository tradeRepository;
    @Mock
    private ContractRepository contractRepository;

    @InjectMocks
    private CommodityService commodityService;

    private static Commodity commodity(long id, String name) {
        Commodity commodity = new Commodity();
        commodity.setId(id);
        commodity.setName(name);
        commodity.setType(CommodityType.ENERGY);
        commodity.setUnitOfMeasurement(UnitOfMeasurement.BARREL);
        commodity.setActive(true);
        return commodity;
    }

    private static CommodityRequest request(String name) {
        return new CommodityRequest(name, CommodityType.ENERGY, UnitOfMeasurement.BARREL, "desc", true);
    }

    @Test
    void createWithDuplicateNameIsRejected() {
        when(commodityRepository.existsByNameIgnoreCase("Copper")).thenReturn(true);

        assertThatThrownBy(() -> commodityService.create(request("Copper")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Copper");
    }

    @Test
    void deleteWhenTradesExistIsRejectedAndNothingIsDeleted() {
        Commodity commodity = commodity(1L, "Copper");
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(tradeRepository.existsByCommodityId(1L)).thenReturn(true);

        assertThatThrownBy(() -> commodityService.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("trades reference it");
        verify(commodityRepository, never()).delete(commodity);
    }

    @Test
    void deleteWhenContractsExistIsRejectedAndNothingIsDeleted() {
        Commodity commodity = commodity(1L, "Copper");
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));
        when(tradeRepository.existsByCommodityId(1L)).thenReturn(false);
        when(contractRepository.existsByCommodityId(1L)).thenReturn(true);

        assertThatThrownBy(() -> commodityService.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("contracts reference it");
        verify(commodityRepository, never()).delete(commodity);
    }

    @Test
    void deleteWhenNotReferencedDeletesTheCommodity() {
        Commodity commodity = commodity(1L, "Copper");
        when(commodityRepository.findById(1L)).thenReturn(Optional.of(commodity));

        commodityService.delete(1L);

        verify(commodityRepository).delete(commodity);
    }

    @Test
    void findByIdWithUnknownIdIsRejected() {
        when(commodityRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commodityService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Commodity");
    }
}
