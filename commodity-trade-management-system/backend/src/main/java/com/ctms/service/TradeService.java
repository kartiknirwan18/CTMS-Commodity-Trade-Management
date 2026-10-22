package com.ctms.service;

import com.ctms.dto.PageResponse;
import com.ctms.dto.PnlResponse;
import com.ctms.dto.TradeRequest;
import com.ctms.dto.TradeResponse;
import com.ctms.entity.Commodity;
import com.ctms.entity.Contract;
import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.exception.BusinessRuleException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.mapper.TradeMapper;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import com.ctms.repository.TradeSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Business logic for trade entry: creation, editing, cancellation, filtered
 * search and P&L lookups.
 */
@Service
@Transactional(readOnly = true)
public class TradeService {

    static final Set<String> SORTABLE_PROPERTIES =
            Set.of("id", "tradeReference", "tradeDate", "quantity", "pricePerUnit", "status", "tradeType", "createdAt");

    static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("tradeDate"), Sort.Order.desc("id"));

    private final TradeRepository tradeRepository;
    private final CommodityRepository commodityRepository;
    private final ContractRepository contractRepository;
    private final ReferenceGenerator referenceGenerator;
    private final PnlService pnlService;

    public TradeService(TradeRepository tradeRepository,
                        CommodityRepository commodityRepository,
                        ContractRepository contractRepository,
                        ReferenceGenerator referenceGenerator,
                        PnlService pnlService) {
        this.tradeRepository = tradeRepository;
        this.commodityRepository = commodityRepository;
        this.contractRepository = contractRepository;
        this.referenceGenerator = referenceGenerator;
        this.pnlService = pnlService;
    }

    /** Paginated and filtered trade list. */
    public PageResponse<TradeResponse> search(Integer page,
                                              Integer size,
                                              List<String> sort,
                                              Long commodityId,
                                              TradeType tradeType,
                                              TradeStatus status,
                                              LocalDate from,
                                              LocalDate to,
                                              String reference) {
        Pageable pageable = PageableFactory.create(page, size, sort, SORTABLE_PROPERTIES, DEFAULT_SORT);
        Page<Trade> result = tradeRepository.findAll(
                TradeSpecifications.withFilters(commodityId, tradeType, status, from, to, reference), pageable);
        List<TradeResponse> content = result.getContent().stream().map(TradeMapper::toResponse).toList();
        return PageResponse.of(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    public TradeResponse findById(Long id) {
        return TradeMapper.toResponse(getTrade(id));
    }

    @Transactional
    public TradeResponse create(TradeRequest request) {
        Commodity commodity = resolveCommodity(request.commodityId());
        Contract contract = resolveContract(request.contractId(), commodity);

        Trade trade = new Trade();
        trade.setTradeReference(resolveReference(request.tradeReference(), null));
        trade.setCommodity(commodity);
        trade.setTradeType(request.tradeType());
        trade.setQuantity(request.quantity());
        trade.setPricePerUnit(request.pricePerUnit());
        trade.setTradeDate(request.tradeDate());
        trade.setCounterparty(trimToNull(request.counterparty()));
        trade.setContract(contract);
        trade.setStatus(request.status() == null ? TradeStatus.DRAFT : request.status());

        return TradeMapper.toResponse(tradeRepository.save(trade));
    }

    @Transactional
    public TradeResponse update(Long id, TradeRequest request) {
        Trade trade = getTrade(id);
        if (trade.getStatus() == TradeStatus.CANCELLED) {
            throw new BusinessRuleException("Trade " + trade.getTradeReference()
                    + " is cancelled and can no longer be edited");
        }

        Commodity commodity = resolveCommodity(request.commodityId());
        Contract contract = resolveContract(request.contractId(), commodity);

        trade.setTradeReference(resolveReference(request.tradeReference(), trade.getTradeReference()));
        trade.setCommodity(commodity);
        trade.setTradeType(request.tradeType());
        trade.setQuantity(request.quantity());
        trade.setPricePerUnit(request.pricePerUnit());
        trade.setTradeDate(request.tradeDate());
        trade.setCounterparty(trimToNull(request.counterparty()));
        trade.setContract(contract);
        if (request.status() != null) {
            trade.setStatus(request.status());
        }

        return TradeMapper.toResponse(tradeRepository.save(trade));
    }

    /**
     * Cancels (or re-confirms) a trade. Records are never deleted, so the audit
     * trail stays available.
     */
    @Transactional
    public TradeResponse updateStatus(Long id, TradeStatus newStatus) {
        Trade trade = getTrade(id);
        if (trade.getStatus() == newStatus) {
            return TradeMapper.toResponse(trade);
        }
        if (trade.getStatus() == TradeStatus.CANCELLED) {
            throw new BusinessRuleException("Trade " + trade.getTradeReference()
                    + " is cancelled and cannot be reopened");
        }
        trade.setStatus(newStatus);
        return TradeMapper.toResponse(tradeRepository.save(trade));
    }

    /** P&L of the commodity position the trade belongs to. */
    public PnlResponse pnl(Long tradeId) {
        return pnlService.pnlForTrade(tradeId);
    }

    private Trade getTrade(Long id) {
        return tradeRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Trade", id));
    }

    private Commodity resolveCommodity(Long commodityId) {
        Commodity commodity = commodityRepository.findById(commodityId)
                .orElseThrow(() -> ResourceNotFoundException.of("Commodity", commodityId));
        if (!commodity.isActive()) {
            throw new BusinessRuleException("Commodity '" + commodity.getName()
                    + "' is inactive and cannot be used for new trades");
        }
        return commodity;
    }

    private Contract resolveContract(Long contractId, Commodity commodity) {
        if (contractId == null) {
            return null;
        }
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ResourceNotFoundException.of("Contract", contractId));
        if (!contract.getCommodity().getId().equals(commodity.getId())) {
            throw new BusinessRuleException("Trade commodity '" + commodity.getName()
                    + "' does not match contract " + contract.getContractReference()
                    + " commodity '" + contract.getCommodity().getName() + "'");
        }
        return contract;
    }

    /**
     * Uses the reference supplied by the client, or generates the next one.
     * Duplicate references are rejected with HTTP 409.
     */
    private String resolveReference(String requested, String currentReference) {
        if (!StringUtils.hasText(requested)) {
            return currentReference != null ? currentReference : referenceGenerator.nextTradeReference();
        }
        String reference = requested.trim();
        if (reference.equalsIgnoreCase(currentReference)) {
            return currentReference;
        }
        if (tradeRepository.existsByTradeReferenceIgnoreCase(reference)) {
            throw new DuplicateResourceException("Trade reference '" + reference + "' already exists");
        }
        return reference;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
