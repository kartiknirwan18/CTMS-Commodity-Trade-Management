package com.ctms.exception;

/**
 * Thrown when an entity id (or a referenced id) does not exist.
 * Mapped to HTTP 404.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String entity, Long id) {
        return new ResourceNotFoundException(entity + " with id " + id + " was not found");
    }
}
