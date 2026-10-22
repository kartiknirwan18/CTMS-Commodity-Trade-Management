package com.ctms.exception;

/**
 * Thrown when a unique value (commodity name, trade reference, contract
 * reference) is already used. Mapped to HTTP 409.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
