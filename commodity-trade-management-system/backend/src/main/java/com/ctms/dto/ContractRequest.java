package com.ctms.dto;

import com.ctms.entity.ContractStatus;
import com.ctms.validation.ValidDeliveryDates;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload for creating/updating a contract.
 *
 * <p>{@link ValidDeliveryDates} enforces the cross-field rule that the delivery
 * date may not be earlier than the contract date.</p>
 */
@ValidDeliveryDates
public record ContractRequest(

        @Size(max = 40, message = "Contract reference must not exceed 40 characters")
        String contractReference,

        @NotBlank(message = "Buyer name is required")
        @Size(max = 150, message = "Buyer name must not exceed 150 characters")
        String buyerName,

        @NotBlank(message = "Seller name is required")
        @Size(max = 150, message = "Seller name must not exceed 150 characters")
        String sellerName,

        @NotNull(message = "Commodity is required")
        Long commodityId,

        @NotNull(message = "Contract quantity is required")
        @DecimalMin(value = "0", inclusive = false, message = "Contract quantity must be greater than zero")
        @Digits(integer = 14, fraction = 4, message = "Contract quantity must have at most 14 digits and 4 decimals")
        BigDecimal contractQuantity,

        @NotNull(message = "Contract price is required")
        @DecimalMin(value = "0", inclusive = false, message = "Contract price must be greater than zero")
        @Digits(integer = 14, fraction = 4, message = "Contract price must have at most 14 digits and 4 decimals")
        BigDecimal contractPrice,

        @NotNull(message = "Contract date is required")
        LocalDate contractDate,

        @NotNull(message = "Delivery date is required")
        LocalDate deliveryDate,

        @Size(max = 150, message = "Delivery location must not exceed 150 characters")
        String deliveryLocation,

        ContractStatus status,

        Long linkedTradeId
) {
}
