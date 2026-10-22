package com.ctms.dto;

/** A single field level validation failure. */
public record FieldValidationError(String field, String message) {
}
