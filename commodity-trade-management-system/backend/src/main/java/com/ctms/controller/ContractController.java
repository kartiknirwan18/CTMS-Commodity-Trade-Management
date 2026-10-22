package com.ctms.controller;

import com.ctms.dto.ContractRequest;
import com.ctms.dto.ContractResponse;
import com.ctms.dto.PageResponse;
import com.ctms.dto.UpcomingDeliveryResponse;
import com.ctms.entity.ContractStatus;
import com.ctms.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

/**
 * Contract REST API.
 *
 * <pre>
 * GET  /api/contracts?page=&amp;size=&amp;sort=&amp;status=&amp;commodityId=&amp;reference=&amp;from=&amp;to=
 * GET  /api/contracts/{id}
 * POST /api/contracts
 * PUT  /api/contracts/{id}
 * GET  /api/contracts/upcoming-deliveries?days=30
 * </pre>
 */
@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public PageResponse<ContractResponse> list(
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", required = false) List<String> sort,
            @RequestParam(name = "commodityId", required = false) Long commodityId,
            @RequestParam(name = "status", required = false) ContractStatus status,
            @RequestParam(name = "reference", required = false) String reference,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return contractService.search(page, size, sort, commodityId, status, reference, from, to);
    }

    @GetMapping("/upcoming-deliveries")
    public List<UpcomingDeliveryResponse> upcomingDeliveries(
            @RequestParam(name = "days", required = false, defaultValue = "30") Integer days) {
        return contractService.upcomingDeliveries(days);
    }

    @GetMapping("/{id}")
    public ContractResponse get(@PathVariable Long id) {
        return contractService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ContractResponse> create(@Valid @RequestBody ContractRequest request) {
        ContractResponse created = contractService.create(request);
        return ResponseEntity.created(URI.create("/api/contracts/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public ContractResponse update(@PathVariable Long id, @Valid @RequestBody ContractRequest request) {
        return contractService.update(id, request);
    }
}
