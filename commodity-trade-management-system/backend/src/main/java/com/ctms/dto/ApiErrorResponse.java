package com.ctms.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Consistent error body returned by every failing endpoint. The React client
 * reads {@code message} for the banner and {@code fieldErrors} for the inline
 * messages under each form field.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldValidationError> fieldErrors
) {
    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(LocalDateTime.now(), status, error, message, path, List.of());
    }

    public static ApiErrorResponse of(int status,
                                      String error,
                                      String message,
                                      String path,
                                      List<FieldValidationError> fieldErrors) {
        return new ApiErrorResponse(LocalDateTime.now(), status, error, message, path,
                fieldErrors == null ? List.of() : fieldErrors);
    }
}
