package com.ctms.dto;

import com.ctms.entity.CommodityType;
import com.ctms.entity.UnitOfMeasurement;

import java.time.LocalDateTime;

/** Commodity representation returned by the REST API. */
public record CommodityResponse(
        Long id,
        String name,
        CommodityType type,
        UnitOfMeasurement unitOfMeasurement,
        String description,
        boolean active,
        LocalDateTime createdAt
) {
}
