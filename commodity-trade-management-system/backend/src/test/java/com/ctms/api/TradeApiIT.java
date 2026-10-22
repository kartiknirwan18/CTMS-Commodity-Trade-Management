package com.ctms.api;

import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import com.ctms.entity.UnitOfMeasurement;
import com.ctms.repository.CommodityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TradeApiIT {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private CommodityRepository commodityRepository;

    private Long commodityId;

    @BeforeEach
    void setUp() {
        Commodity commodity = new Commodity();
        commodity.setName("Trade API Commodity " + UUID.randomUUID());
        commodity.setType(CommodityType.ENERGY);
        commodity.setUnitOfMeasurement(UnitOfMeasurement.BARREL);
        commodity.setActive(true);
        commodityId = commodityRepository.save(commodity).getId();
    }

    private String validTradeBody(String reference) {
        return """
                {"tradeReference":"%s","commodityId":%d,"tradeType":"BUY","quantity":10,"pricePerUnit":5.5,\
                "tradeDate":"%s","counterparty":"Counterparty"}
                """.formatted(reference, commodityId, LocalDate.now().minusDays(1));
    }

    private record CreatedTrade(long id, String reference) {
    }

    private CreatedTrade createTrade() throws Exception {
        String reference = "TRD-API-" + UUID.randomUUID();
        MvcResult result = mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validTradeBody(reference)))
                .andExpect(status().isCreated())
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        return new CreatedTrade(Long.parseLong(location.substring(location.lastIndexOf('/') + 1)), reference);
    }

    @Test
    void createValidTradeReturns201AndDerivedTotalValue() throws Exception {
        String reference = "TRD-API-" + UUID.randomUUID();

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validTradeBody(reference)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.tradeReference").value(reference))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.quantity").value(10.0))
                .andExpect(jsonPath("$.pricePerUnit").value(5.5))
                .andExpect(jsonPath("$.totalValue").value(55.0));
    }

    @Test
    void createWithMissingQuantityReturns400() throws Exception {
        String body = """
                {"tradeReference":"TRD-NOQTY-%s","commodityId":%d,"tradeType":"BUY","pricePerUnit":5.5,\
                "tradeDate":"%s"}
                """.formatted(UUID.randomUUID(), commodityId, LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void createWithZeroQuantityReturns400() throws Exception {
        String body = """
                {"tradeReference":"TRD-ZERO-%s","commodityId":%d,"tradeType":"BUY","quantity":0,"pricePerUnit":5.5,\
                "tradeDate":"%s"}
                """.formatted(UUID.randomUUID(), commodityId, LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void createWithFutureTradeDateReturns400() throws Exception {
        String body = """
                {"tradeReference":"TRD-FUTURE-%s","commodityId":%d,"tradeType":"BUY","quantity":10,"pricePerUnit":5.5,\
                "tradeDate":"%s"}
                """.formatted(UUID.randomUUID(), commodityId, LocalDate.now().plusDays(5));

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void listReturnsPagedEnvelope() throws Exception {
        mockMvc.perform(get("/api/trades").param("page", "0").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    void updateStatusChangesTheStatusAndCancelledTradeCanNoLongerBeEdited() throws Exception {
        CreatedTrade trade = createTrade();

        mockMvc.perform(patch("/api/trades/" + trade.id() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(put("/api/trades/" + trade.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validTradeBody("TRD-API-" + UUID.randomUUID())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void pnlEndpointReturnsFifoBreakdown() throws Exception {
        CreatedTrade trade = createTrade();

        mockMvc.perform(get("/api/trades/" + trade.id() + "/pnl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tradeReference").value(trade.reference()))
                .andExpect(jsonPath("$.costBasisMethod").value("FIFO"))
                .andExpect(jsonPath("$.disclaimer").isString())
                .andExpect(jsonPath("$.disclaimer").isNotEmpty())
                .andExpect(jsonPath("$.unrealizedPnlAvailable").value(false))
                .andExpect(jsonPath("$.realizedPnlAvailable").value(false));
    }

    @Test
    void createWithUnknownCommodityReturns404() throws Exception {
        String body = """
                {"tradeReference":"TRD-NOCOMM-%s","commodityId":999999999,"tradeType":"BUY","quantity":10,\
                "pricePerUnit":5.5,"tradeDate":"%s"}
                """.formatted(UUID.randomUUID(), LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateReferenceReturns409() throws Exception {
        String reference = "TRD-API-" + UUID.randomUUID();

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validTradeBody(reference)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validTradeBody(reference)))
                .andExpect(status().isConflict());
    }

    @Test
    void getByUnknownIdReturns404() throws Exception {
        mockMvc.perform(get("/api/trades/999999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createdTradeIsRetrievable() throws Exception {
        CreatedTrade trade = createTrade();

        MvcResult result = mockMvc.perform(get("/api/trades/" + trade.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).contains("\"status\":\"DRAFT\"");
    }
}
