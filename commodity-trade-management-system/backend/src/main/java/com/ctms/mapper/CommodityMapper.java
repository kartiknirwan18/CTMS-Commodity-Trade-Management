package com.ctms.mapper;

import com.ctms.dto.CommodityRequest;
import com.ctms.dto.CommodityResponse;
import com.ctms.entity.Commodity;
import org.springframework.util.StringUtils;

/**
 * Translates between the commodity entity and its API representations, so the
 * entity never leaks into the REST layer and vice versa.
 */
public final class CommodityMapper {

    private CommodityMapper() {
    }

    public static Commodity toEntity(CommodityRequest request) {
        Commodity commodity = new Commodity();
        applyUpdate(commodity, request);
        return commodity;
    }

    public static void applyUpdate(Commodity commodity, CommodityRequest request) {
        commodity.setName(request.name() == null ? null : request.name().trim());
        commodity.setType(request.type());
        commodity.setUnitOfMeasurement(request.unitOfMeasurement());
        commodity.setDescription(trimToNull(request.description()));
        commodity.setActive(request.active() == null || request.active());
    }

    public static CommodityResponse toResponse(Commodity commodity) {
        return new CommodityResponse(
                commodity.getId(),
                commodity.getName(),
                commodity.getType(),
                commodity.getUnitOfMeasurement(),
                commodity.getDescription(),
                commodity.isActive(),
                commodity.getCreatedAt()
        );
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
