package com.ctms.controller;

import com.ctms.dto.PageResponse;
import com.ctms.dto.PnlResponse;
import com.ctms.dto.TradeRequest;
import com.ctms.dto.TradeResponse;
import com.ctms.dto.TradeStatusRequest;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import com.ctms.service.TradeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
 * Trade REST API.
 *
 * <pre>
 * GET   /api/trades?page=&amp;size=&amp;sort=&amp;commodityId=&amp;tradeType=&amp;status=&amp;from=&amp;to=&amp;reference=
 * GET   /api/trades/{id}
 * POST  /api/trades
 * PUT   /api/trades/{id}
 * PATCH /api/trades/{id}/status
 * GET   /api/trades/{id}/pnl
 * </pre>
 */
@RestController
@RequestMapping("/api/trades")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @GetMapping
    public PageResponse<TradeResponse> list(
            @RequestParam(name = "page", defaultValue = "0") Integer page,
            @RequestParam(name = "size", defaultValue = "10") Integer size,
            @RequestParam(name = "sort", required = false) List<String> sort,
            @RequestParam(name = "commodityId", required = false) Long commodityId,
            @RequestParam(name = "tradeType", required = false) TradeType tradeType,
            @RequestParam(name = "status", required = false) TradeStatus status,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "reference", required = false) String reference) {
        return tradeService.search(page, size, sort, commodityId, tradeType, status, from, to, reference);
    }

    @GetMapping("/{id}")
    public TradeResponse get(@PathVariable Long id) {
        return tradeService.findById(id);
    }

    @PostMapping
    public ResponseEntity<TradeResponse> create(@Valid @RequestBody TradeRequest request) {
        TradeResponse created = tradeService.create(request);
        return ResponseEntity.created(URI.create("/api/trades/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public TradeResponse update(@PathVariable Long id, @Valid @RequestBody TradeRequest request) {
        return tradeService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public TradeResponse updateStatus(@PathVariable Long id,
                                      @Valid @RequestBody TradeStatusRequest request) {
        return tradeService.updateStatus(id, request.status());
    }

    @GetMapping("/{id}/pnl")
    public PnlResponse pnl(@PathVariable Long id) {
        return tradeService.pnl(id);
    }
}
