package com.ctms.dto;

import com.ctms.entity.ContractStatus;
import com.ctms.entity.UnitOfMeasurement;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A contract delivery that falls inside the requested forward-looking window.
 */
public record UpcomingDeliveryResponse(
        Long contractId,
        String contractReference,
        String commodityName,
        UnitOfMeasurement unitOfMeasurement,
        BigDecimal contractQuantity,
        LocalDate deliveryDate,
        long daysUntilDelivery,
        String deliveryLocation,
        String buyerName,
        String sellerName,
        ContractStatus status
) {
}
