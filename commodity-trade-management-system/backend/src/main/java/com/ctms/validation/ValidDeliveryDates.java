package com.ctms.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Class level constraint: the delivery date of a contract must not be earlier
 * than its contract date.
 */
@Documented
@Constraint(validatedBy = DeliveryDatesValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDeliveryDates {

    String message() default "Delivery date must not be earlier than the contract date";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
