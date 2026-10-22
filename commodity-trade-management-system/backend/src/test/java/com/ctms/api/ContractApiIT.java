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

import java.util.UUID;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContractApiIT {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private CommodityRepository commodityRepository;

    private Long commodityId;

    @BeforeEach
    void setUp() {
        Commodity commodity = new Commodity();
        commodity.setName("Contract API Commodity " + UUID.randomUUID());
        commodity.setType(CommodityType.ENERGY);
        commodity.setUnitOfMeasurement(UnitOfMeasurement.BARREL);
        commodity.setActive(true);
        commodityId = commodityRepository.save(commodity).getId();
    }

    @Test
    void createWithDeliveryDateBeforeContractDateReturns400() throws Exception {
        String body = """
                {"contractReference":"CTR-API-%s","buyerName":"Buyer Corp","sellerName":"Seller Corp",\
                "commodityId":%d,"contractQuantity":100,"contractPrice":50,"contractDate":"2026-02-10",\
                "deliveryDate":"2026-02-01","deliveryLocation":"Rotterdam","status":"DRAFT"}
                """.formatted(UUID.randomUUID(), commodityId);

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.fieldErrors.length()", greaterThan(0)));
    }

    @Test
    void createWithIdenticalBuyerAndSellerReturns400() throws Exception {
        String body = """
                {"contractReference":"CTR-API-%s","buyerName":"ACME Trading","sellerName":"acme trading",\
                "commodityId":%d,"contractQuantity":100,"contractPrice":50,"contractDate":"2026-02-01",\
                "deliveryDate":"2026-03-01","deliveryLocation":"Rotterdam","status":"DRAFT"}
                """.formatted(UUID.randomUUID(), commodityId);

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void createValidContractReturns201() throws Exception {
        String reference = "CTR-API-" + UUID.randomUUID();
        String body = """
                {"contractReference":"%s","buyerName":"Buyer Corp","sellerName":"Seller Corp",\
                "commodityId":%d,"contractQuantity":100,"contractPrice":50,"contractDate":"2026-02-01",\
                "deliveryDate":"2026-03-01","deliveryLocation":"Rotterdam","status":"ACTIVE"}
                """.formatted(reference, commodityId);

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.contractReference").value(reference))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.contractValue").value(5000.0));
    }

    @Test
    void duplicateReferenceReturns409() throws Exception {
        String reference = "CTR-API-" + UUID.randomUUID();
        String body = """
                {"contractReference":"%s","buyerName":"Buyer Corp","sellerName":"Seller Corp",\
                "commodityId":%d,"contractQuantity":100,"contractPrice":50,"contractDate":"2026-02-01",\
                "deliveryDate":"2026-03-01","status":"DRAFT"}
                """.formatted(reference, commodityId);

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void upcomingDeliveriesReturns200WithAnArray() throws Exception {
        mockMvc.perform(get("/api/contracts/upcoming-deliveries").param("days", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void listReturnsPagedEnvelope() throws Exception {
        mockMvc.perform(get("/api/contracts").param("page", "0").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(5));
    }
}
