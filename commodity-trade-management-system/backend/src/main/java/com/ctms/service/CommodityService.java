package com.ctms.service;

import com.ctms.dto.CommodityRequest;
import com.ctms.dto.CommodityResponse;
import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.exception.ConflictException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.mapper.CommodityMapper;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.CommoditySpecifications;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Business logic for the commodity master module.
 */
@Service
@Transactional(readOnly = true)
public class CommodityService {

    private final CommodityRepository commodityRepository;
    private final TradeRepository tradeRepository;
    private final ContractRepository contractRepository;

    public CommodityService(CommodityRepository commodityRepository,
                            TradeRepository tradeRepository,
                            ContractRepository contractRepository) {
        this.commodityRepository = commodityRepository;
        this.tradeRepository = tradeRepository;
        this.contractRepository = contractRepository;
    }

    /** All commodities, optionally filtered by (partial) name, status and type. */
    public List<CommodityResponse> findAll(String query, Boolean active, CommodityType type) {
        return commodityRepository
                .findAll(CommoditySpecifications.withFilters(query, active, type), Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(CommodityMapper::toResponse)
                .toList();
    }

    public CommodityResponse findById(Long id) {
        return CommodityMapper.toResponse(getCommodity(id));
    }

    @Transactional
    public CommodityResponse create(CommodityRequest request) {
        String name = request.name().trim();
        if (commodityRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("A commodity named '" + name + "' already exists");
        }
        Commodity commodity = CommodityMapper.toEntity(request);
        return CommodityMapper.toResponse(commodityRepository.save(commodity));
    }

    @Transactional
    public CommodityResponse update(Long id, CommodityRequest request) {
        Commodity commodity = getCommodity(id);
        String name = request.name().trim();
        if (!commodity.getName().equalsIgnoreCase(name) && commodityRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("A commodity named '" + name + "' already exists");
        }
        CommodityMapper.applyUpdate(commodity, request);
        return CommodityMapper.toResponse(commodityRepository.save(commodity));
    }

    /** Activates or deactivates a commodity instead of deleting it. */
    @Transactional
    public CommodityResponse updateStatus(Long id, boolean active) {
        Commodity commodity = getCommodity(id);
        commodity.setActive(active);
        return CommodityMapper.toResponse(commodityRepository.save(commodity));
    }

    /**
     * Deletes a commodity only when nothing references it. Otherwise the caller
     * receives HTTP 409 with a hint to deactivate it instead.
     */
    @Transactional
    public void delete(Long id) {
        Commodity commodity = getCommodity(id);
        if (tradeRepository.existsByCommodityId(id)) {
            throw new ConflictException("Commodity '" + commodity.getName()
                    + "' cannot be deleted because trades reference it. Deactivate it instead.");
        }
        if (contractRepository.existsByCommodityId(id)) {
            throw new ConflictException("Commodity '" + commodity.getName()
                    + "' cannot be deleted because contracts reference it. Deactivate it instead.");
        }
        commodityRepository.delete(commodity);
    }

    private Commodity getCommodity(Long id) {
        return commodityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Commodity", id));
    }
}
