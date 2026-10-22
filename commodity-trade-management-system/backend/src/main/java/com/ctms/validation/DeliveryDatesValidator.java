package com.ctms.validation;

import com.ctms.dto.ContractRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.LocalDate;

/**
 * Implements {@link ValidDeliveryDates}: compares the two date fields of the
 * request and rejects the payload when the delivery is scheduled before the
 * contract date. Missing dates are left to the {@code @NotNull} checks.
 */
public class DeliveryDatesValidator implements ConstraintValidator<ValidDeliveryDates, ContractRequest> {

    @Override
    public boolean isValid(ContractRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true;
        }
        LocalDate contractDate = request.contractDate();
        LocalDate deliveryDate = request.deliveryDate();
        if (contractDate == null || deliveryDate == null) {
            return true;
        }
        if (deliveryDate.isBefore(contractDate)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                            "Delivery date must not be earlier than the contract date")
                    .addPropertyNode("deliveryDate")
                    .addConstraintViolation();
            return false;
        }
        return true;
    }
}
