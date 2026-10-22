package com.ctms.dto;

import com.ctms.entity.CommodityType;
import com.ctms.entity.UnitOfMeasurement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload for creating/updating a commodity.
 *
 * <p>Bean Validation annotations are the first line of defence: they are
 * evaluated before the request reaches the service layer. Cross-record rules
 * (such as "the name must be unique") are enforced in the service.</p>
 */
public record CommodityRequest(

        @NotBlank(message = "Commodity name is required")
        @Size(max = 100, message = "Commodity name must not exceed 100 characters")
        String name,

        @NotNull(message = "Commodity type is required")
        CommodityType type,

        @NotNull(message = "Unit of measurement is required")
        UnitOfMeasurement unitOfMeasurement,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        Boolean active
) {
}
