package com.ctms.dto;

import com.ctms.entity.ContractStatus;
import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Contract representation returned by the REST API. */
public record ContractResponse(
        Long id,
        String contractReference,
        String buyerName,
        String sellerName,
        Long commodityId,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        BigDecimal contractQuantity,
        BigDecimal contractPrice,
        BigDecimal contractValue,
        LocalDate contractDate,
        LocalDate deliveryDate,
        String deliveryLocation,
        ContractStatus status,
        Long linkedTradeId,
        String linkedTradeReference,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
