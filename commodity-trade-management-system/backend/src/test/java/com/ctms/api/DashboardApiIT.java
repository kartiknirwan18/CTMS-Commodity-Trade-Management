package com.ctms.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void summaryReturnsDocumentedFields() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTrades").isNumber())
                .andExpect(jsonPath("$.draftTrades").isNumber())
                .andExpect(jsonPath("$.confirmedTrades").isNumber())
                .andExpect(jsonPath("$.cancelledTrades").isNumber())
                .andExpect(jsonPath("$.totalTradeVolume").isNumber())
                .andExpect(jsonPath("$.totalTradeValue").isNumber())
                .andExpect(jsonPath("$.realizedPnlAvailable").exists())
                .andExpect(jsonPath("$.unrealizedPnlAvailable").value(false))
                .andExpect(jsonPath("$.pnlDisclaimer").isString())
                .andExpect(jsonPath("$.pnlDisclaimer").isNotEmpty())
                .andExpect(jsonPath("$.totalCommodities").isNumber())
                .andExpect(jsonPath("$.activeCommodities").isNumber())
                .andExpect(jsonPath("$.activeContracts").isNumber())
                .andExpect(jsonPath("$.upcomingDeliveries").isNumber())
                .andExpect(jsonPath("$.upcomingDeliveryWindowDays").value(30));
    }

    @Test
    void tradeVolumeReturnsAnArray() throws Exception {
        mockMvc.perform(get("/api/dashboard/trade-volume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void tradeActivityReturnsOneEntryPerRequestedMonth() throws Exception {
        mockMvc.perform(get("/api/dashboard/trade-activity").param("months", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[0].period").isString())
                .andExpect(jsonPath("$[0].label").isString())
                .andExpect(jsonPath("$[0].tradeCount").isNumber())
                .andExpect(jsonPath("$[0].buyCount").isNumber())
                .andExpect(jsonPath("$[0].sellCount").isNumber())
                .andExpect(jsonPath("$[0].buyValue").isNumber())
                .andExpect(jsonPath("$[0].sellValue").isNumber())
                .andExpect(jsonPath("$[0].totalValue").isNumber())
                .andExpect(jsonPath("$[0].totalQuantity").isNumber());
    }

    @Test
    void pnlBreakdownReturnsDocumentedFields() throws Exception {
        mockMvc.perform(get("/api/dashboard/pnl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.realizedPnlAvailable").exists())
                .andExpect(jsonPath("$.costBasisMethod").value("FIFO"))
                .andExpect(jsonPath("$.disclaimer").isString())
                .andExpect(jsonPath("$.disclaimer").isNotEmpty());
    }

    @Test
    void healthEndpointReportsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.application").value("CTMS"))
                .andExpect(jsonPath("$.database").isString());
    }
}
