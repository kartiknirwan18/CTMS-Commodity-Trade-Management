package com.ctms.controller;

import com.ctms.dto.DashboardSummaryResponse;
import com.ctms.dto.PnlBreakdownResponse;
import com.ctms.dto.TradeActivityResponse;
import com.ctms.dto.TradeVolumeResponse;
import com.ctms.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Dashboard and reporting REST API. Every value is aggregated from the database
 * on each request.
 *
 * <pre>
 * GET /api/dashboard/summary
 * GET /api/dashboard/trade-volume
 * GET /api/dashboard/trade-activity?months=6
 * GET /api/dashboard/pnl
 * </pre>
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return dashboardService.summary();
    }

    @GetMapping("/trade-volume")
    public List<TradeVolumeResponse> tradeVolume() {
        return dashboardService.tradeVolume();
    }

    @GetMapping("/trade-activity")
    public List<TradeActivityResponse> tradeActivity(
            @RequestParam(name = "months", required = false, defaultValue = "6") Integer months) {
        return dashboardService.tradeActivity(months);
    }

    @GetMapping("/pnl")
    public PnlBreakdownResponse pnl() {
        return dashboardService.pnlBreakdown();
    }
}
