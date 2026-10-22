package com.ctms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point of the Commodity Trade Management System (CTMS) backend.
 *
 * <p>The application exposes REST APIs under {@code /api} for commodity master
 * data, buy/sell trades, delivery contracts and dashboard analytics, and
 * persists everything through Spring Data JPA / Hibernate.</p>
 */
@SpringBootApplication
public class CtmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CtmsApplication.class, args);
    }
}
