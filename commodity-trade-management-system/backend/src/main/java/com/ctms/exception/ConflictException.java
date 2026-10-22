package com.ctms.exception;

/**
 * Thrown when a request conflicts with the current state of the data, for
 * example deleting a commodity that still has trades. Mapped to HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
