package com.ctms.validation;

import com.ctms.dto.ContractRequest;
import com.ctms.entity.ContractStatus;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the record level {@link ValidDeliveryDates} constraint through the
 * standard Bean Validation entry point.
 */
class DeliveryDatesValidatorTest {

    private static final String DATE_RULE_MESSAGE = "Delivery date must not be earlier than the contract date";

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static ContractRequest request(LocalDate contractDate, LocalDate deliveryDate) {
        return new ContractRequest(
                "CTR-TEST-0001",
                "Buyer Corp",
                "Seller Corp",
                1L,
                new BigDecimal("100.0000"),
                new BigDecimal("50.0000"),
                contractDate,
                deliveryDate,
                "Rotterdam",
                ContractStatus.DRAFT,
                null);
    }

    @Test
    void deliveryDateBeforeContractDateProducesDeliveryDateViolation() {
        ContractRequest request = request(LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 1));

        Set<ConstraintViolation<ContractRequest>> violations = validator.validate(request);

        assertThat(violations).isNotEmpty();
        List<ConstraintViolation<ContractRequest>> dateViolations = violations.stream()
                .filter(violation -> DATE_RULE_MESSAGE.equals(violation.getMessage()))
                .toList();
        assertThat(dateViolations).hasSize(1);
        assertThat(dateViolations.get(0).getPropertyPath().toString()).isEqualTo("deliveryDate");
    }

    @Test
    void deliveryDateEqualToContractDateIsValid() {
        ContractRequest request = request(LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 10));

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void deliveryDateAfterContractDateIsValid() {
        ContractRequest request = request(LocalDate.of(2026, 2, 10), LocalDate.of(2026, 3, 1));

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void nullDatesAreDelegatedToNotNullAndAlwaysAcceptedByTheValidator() {
        ContractRequest request = request(null, null);

        // The cross-field validator lets null dates through (context is never
        // touched in that branch), so passing a null context is safe here.
        assertThat(new DeliveryDatesValidator().isValid(request, null)).isTrue();

        Set<ConstraintViolation<ContractRequest>> violations = validator.validate(request);
        assertThat(violations).hasSize(2);
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("contractDate", "deliveryDate");
        assertThat(violations)
                .noneMatch(violation -> DATE_RULE_MESSAGE.equals(violation.getMessage()));
    }

    @Test
    void singleNullDateIsAcceptedByTheValidatorToo() {
        ContractRequest request = request(null, LocalDate.of(2026, 2, 1));

        assertThat(new DeliveryDatesValidator().isValid(request, null)).isTrue();

        Set<ConstraintViolation<ContractRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("contractDate");
    }

    @Test
    void nullRequestIsAccepted() {
        assertThat(new DeliveryDatesValidator().isValid(null, null)).isTrue();
    }
}
