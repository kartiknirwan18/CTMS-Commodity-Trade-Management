package com.ctms.exception;

/**
 * Thrown when a syntactically valid request violates a trading business rule
 * (for example editing a cancelled trade or linking a trade to a contract of a
 * different commodity). Mapped to HTTP 400.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
