package com.ctms.service;

import com.ctms.dto.ContractRequest;
import com.ctms.dto.ContractResponse;
import com.ctms.dto.PageResponse;
import com.ctms.dto.UpcomingDeliveryResponse;
import com.ctms.entity.Commodity;
import com.ctms.entity.Contract;
import com.ctms.entity.ContractStatus;
import com.ctms.entity.Trade;
import com.ctms.exception.BusinessRuleException;
import com.ctms.exception.DuplicateResourceException;
import com.ctms.exception.ResourceNotFoundException;
import com.ctms.mapper.ContractMapper;
import com.ctms.repository.CommodityRepository;
import com.ctms.repository.ContractRepository;
import com.ctms.repository.ContractSpecifications;
import com.ctms.repository.TradeRepository;
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
 * Business logic for delivery contracts.
 */
@Service
@Transactional(readOnly = true)
public class ContractService {

    static final Set<String> SORTABLE_PROPERTIES =
            Set.of("id", "contractReference", "contractDate", "deliveryDate", "contractQuantity",
                    "contractPrice", "status", "createdAt");

    static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("contractDate"), Sort.Order.desc("id"));

    private static final int DEFAULT_UPCOMING_DAYS = 30;
    private static final int MAX_UPCOMING_DAYS = 365;

    private final ContractRepository contractRepository;
    private final CommodityRepository commodityRepository;
    private final TradeRepository tradeRepository;
    private final ReferenceGenerator referenceGenerator;

    public ContractService(ContractRepository contractRepository,
                           CommodityRepository commodityRepository,
                           TradeRepository tradeRepository,
                           ReferenceGenerator referenceGenerator) {
        this.contractRepository = contractRepository;
        this.commodityRepository = commodityRepository;
        this.tradeRepository = tradeRepository;
        this.referenceGenerator = referenceGenerator;
    }

    public PageResponse<ContractResponse> search(Integer page,
                                                 Integer size,
                                                 List<String> sort,
                                                 Long commodityId,
                                                 ContractStatus status,
                                                 String reference,
                                                 LocalDate from,
                                                 LocalDate to) {
        Pageable pageable = PageableFactory.create(page, size, sort, SORTABLE_PROPERTIES, DEFAULT_SORT);
        Page<Contract> result = contractRepository.findAll(
                ContractSpecifications.withFilters(commodityId, status, reference, from, to), pageable);
        List<ContractResponse> content = result.getContent().stream().map(ContractMapper::toResponse).toList();
        return PageResponse.of(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    public ContractResponse findById(Long id) {
        return ContractMapper.toResponse(getContract(id));
    }

    @Transactional
    public ContractResponse create(ContractRequest request) {
        Commodity commodity = resolveCommodity(request.commodityId());
        Trade linkedTrade = resolveLinkedTrade(request.linkedTradeId(), commodity);
        validateDates(request);

        Contract contract = new Contract();
        contract.setContractReference(resolveReference(request.contractReference(), null));
        applyFields(contract, request, commodity, linkedTrade);

        return ContractMapper.toResponse(contractRepository.save(contract));
    }

    @Transactional
    public ContractResponse update(Long id, ContractRequest request) {
        Contract contract = getContract(id);
        if (contract.getStatus() == ContractStatus.CANCELLED) {
            throw new BusinessRuleException("Contract " + contract.getContractReference()
                    + " is cancelled and can no longer be edited");
        }

        Commodity commodity = resolveCommodity(request.commodityId());
        Trade linkedTrade = resolveLinkedTrade(request.linkedTradeId(), commodity);
        validateDates(request);

        contract.setContractReference(resolveReference(request.contractReference(), contract.getContractReference()));
        applyFields(contract, request, commodity, linkedTrade);

        return ContractMapper.toResponse(contractRepository.save(contract));
    }

    /**
     * Contracts delivering within the next {@code days} days that are still
     * relevant (DRAFT or ACTIVE).
     */
    public List<UpcomingDeliveryResponse> upcomingDeliveries(Integer days) {
        int window = days == null || days <= 0 ? DEFAULT_UPCOMING_DAYS : Math.min(days, MAX_UPCOMING_DAYS);
        LocalDate today = LocalDate.now();
        List<Contract> contracts = contractRepository.findUpcomingDeliveries(
                List.of(ContractStatus.DRAFT, ContractStatus.ACTIVE), today, today.plusDays(window));
        return contracts.stream()
                .map(contract -> ContractMapper.toUpcomingResponse(contract, today))
                .toList();
    }

    /** Number of contracts delivering inside the window - used by the dashboard card. */
    public long countUpcomingDeliveries(int days) {
        LocalDate today = LocalDate.now();
        return contractRepository.findUpcomingDeliveries(
                List.of(ContractStatus.DRAFT, ContractStatus.ACTIVE), today, today.plusDays(days)).size();
    }

    private void applyFields(Contract contract, ContractRequest request, Commodity commodity, Trade linkedTrade) {
        contract.setBuyerName(request.buyerName().trim());
        contract.setSellerName(request.sellerName().trim());
        contract.setCommodity(commodity);
        contract.setContractQuantity(request.contractQuantity());
        contract.setContractPrice(request.contractPrice());
        contract.setContractDate(request.contractDate());
        contract.setDeliveryDate(request.deliveryDate());
        contract.setDeliveryLocation(StringUtils.hasText(request.deliveryLocation())
                ? request.deliveryLocation().trim() : null);
        contract.setStatus(request.status() == null ? ContractStatus.DRAFT : request.status());
        contract.setLinkedTrade(linkedTrade);
    }

    /** Cross-field business rule (also enforced by the {@code @ValidDeliveryDates} constraint). */
    private void validateDates(ContractRequest request) {
        if (request.deliveryDate().isBefore(request.contractDate())) {
            throw new BusinessRuleException("Delivery date must not be earlier than the contract date");
        }
        if (request.buyerName().trim().equalsIgnoreCase(request.sellerName().trim())) {
            throw new BusinessRuleException("Buyer and seller must be different parties");
        }
    }

    private Contract getContract(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Contract", id));
    }

    private Commodity resolveCommodity(Long commodityId) {
        Commodity commodity = commodityRepository.findById(commodityId)
                .orElseThrow(() -> ResourceNotFoundException.of("Commodity", commodityId));
        if (!commodity.isActive()) {
            throw new BusinessRuleException("Commodity '" + commodity.getName()
                    + "' is inactive and cannot be used for new contracts");
        }
        return commodity;
    }

    private Trade resolveLinkedTrade(Long tradeId, Commodity commodity) {
        if (tradeId == null) {
            return null;
        }
        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Trade", tradeId));
        if (!trade.getCommodity().getId().equals(commodity.getId())) {
            throw new BusinessRuleException("Linked trade " + trade.getTradeReference()
                    + " belongs to commodity '" + trade.getCommodity().getName()
                    + "' and cannot be linked to a contract for '" + commodity.getName() + "'");
        }
        return trade;
    }

    private String resolveReference(String requested, String currentReference) {
        if (!StringUtils.hasText(requested)) {
            return currentReference != null ? currentReference : referenceGenerator.nextContractReference();
        }
        String reference = requested.trim();
        if (reference.equalsIgnoreCase(currentReference)) {
            return currentReference;
        }
        if (contractRepository.existsByContractReferenceIgnoreCase(reference)) {
            throw new DuplicateResourceException("Contract reference '" + reference + "' already exists");
        }
        return reference;
    }
}
