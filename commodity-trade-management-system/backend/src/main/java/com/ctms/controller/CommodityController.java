package com.ctms.controller;

import com.ctms.dto.CommodityRequest;
import com.ctms.dto.CommodityResponse;
import com.ctms.dto.CommodityStatusRequest;
import com.ctms.entity.CommodityType;
import com.ctms.service.CommodityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import java.util.List;

/**
 * Commodity master REST API.
 *
 * <pre>
 * GET    /api/commodities?q=&amp;active=&amp;type=
 * GET    /api/commodities/{id}
 * POST   /api/commodities
 * PUT    /api/commodities/{id}
 * PATCH  /api/commodities/{id}/status
 * DELETE /api/commodities/{id}
 * </pre>
 */
@RestController
@RequestMapping("/api/commodities")
public class CommodityController {

    private final CommodityService commodityService;

    public CommodityController(CommodityService commodityService) {
        this.commodityService = commodityService;
    }

    @GetMapping
    public List<CommodityResponse> list(@RequestParam(name = "q", required = false) String query,
                                        @RequestParam(name = "active", required = false) Boolean active,
                                        @RequestParam(name = "type", required = false) CommodityType type) {
        return commodityService.findAll(query, active, type);
    }

    @GetMapping("/{id}")
    public CommodityResponse get(@PathVariable Long id) {
        return commodityService.findById(id);
    }

    @PostMapping
    public ResponseEntity<CommodityResponse> create(@Valid @RequestBody CommodityRequest request) {
        CommodityResponse created = commodityService.create(request);
        return ResponseEntity.created(URI.create("/api/commodities/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public CommodityResponse update(@PathVariable Long id, @Valid @RequestBody CommodityRequest request) {
        return commodityService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public CommodityResponse updateStatus(@PathVariable Long id,
                                         @Valid @RequestBody CommodityStatusRequest request) {
        return commodityService.updateStatus(id, request.active());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        commodityService.delete(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
