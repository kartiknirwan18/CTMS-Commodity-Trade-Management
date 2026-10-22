package com.ctms.dto;

import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload for creating/updating a trade.
 *
 * <p>{@code tradeReference} is optional: when it is blank the service
 * generates one in the form {@code TRD-<year>-<sequence>}.</p>
 */
public record TradeRequest(

        @Size(max = 40, message = "Trade reference must not exceed 40 characters")
        String tradeReference,

        @NotNull(message = "Commodity is required")
        Long commodityId,

        @NotNull(message = "Trade type is required (BUY or SELL)")
        TradeType tradeType,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0", inclusive = false, message = "Quantity must be greater than zero")
        @Digits(integer = 14, fraction = 4, message = "Quantity must have at most 14 digits and 4 decimals")
        BigDecimal quantity,

        @NotNull(message = "Price per unit is required")
        @DecimalMin(value = "0", message = "Price per unit must be zero or greater")
        @Digits(integer = 14, fraction = 4, message = "Price per unit must have at most 14 digits and 4 decimals")
        BigDecimal pricePerUnit,

        @NotNull(message = "Trade date is required")
        @PastOrPresent(message = "Trade date cannot be in the future")
        LocalDate tradeDate,

        @Size(max = 150, message = "Counterparty must not exceed 150 characters")
        String counterparty,

        Long contractId,

        TradeStatus status
) {
}
