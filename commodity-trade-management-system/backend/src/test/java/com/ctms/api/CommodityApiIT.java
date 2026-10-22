package com.ctms.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommodityApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createReturns201WithLocationHeader() throws Exception {
        String name = "API Commodity " + UUID.randomUUID();
        String body = """
                {"name":"%s","type":"ENERGY","unitOfMeasurement":"BARREL","description":"test","active":true}
                """.formatted(name);

        MvcResult result = mockMvc.perform(post("/api/commodities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn();

        String location = result.getResponse().getHeader("Location");
        assertThat(location).startsWith("/api/commodities/");

        mockMvc.perform(get(location))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name));
    }

    @Test
    void duplicateNameReturns409() throws Exception {
        String name = "Duplicate Commodity " + UUID.randomUUID();
        String body = """
                {"name":"%s","type":"ENERGY","unitOfMeasurement":"BARREL","active":true}
                """.formatted(name);

        mockMvc.perform(post("/api/commodities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/commodities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void listReturns200WithAnArray() throws Exception {
        mockMvc.perform(get("/api/commodities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getByUnknownIdReturns404() throws Exception {
        mockMvc.perform(get("/api/commodities/999999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void blankNameReturns400WithFieldErrors() throws Exception {
        String body = """
                {"name":"","type":"ENERGY","unitOfMeasurement":"BARREL","active":true}
                """;

        mockMvc.perform(post("/api/commodities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.fieldErrors.length()", greaterThan(0)))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"))
                .andExpect(jsonPath("$.fieldErrors[0].message").isString());
    }

    @Test
    void missingTypeReturns400WithFieldErrors() throws Exception {
        String body = """
                {"name":"No Type Commodity","unitOfMeasurement":"BARREL","active":true}
                """;

        mockMvc.perform(post("/api/commodities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.fieldErrors.length()", greaterThan(0)));
    }
}
