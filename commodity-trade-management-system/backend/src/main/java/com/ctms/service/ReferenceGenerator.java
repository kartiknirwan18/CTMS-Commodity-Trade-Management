package com.ctms.service;

import com.ctms.repository.ContractRepository;
import com.ctms.repository.TradeRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Generates human readable business references when the client does not supply
 * one, e.g. {@code TRD-2026-0007} / {@code CTR-2026-0003}.
 *
 * <p>The sequence is derived from the number of existing references of the same
 * year and is verified against the unique constraint before it is used.</p>
 */
@Component
public class ReferenceGenerator {

    private static final int MAX_ATTEMPTS = 10_000;

    private final TradeRepository tradeRepository;
    private final ContractRepository contractRepository;

    public ReferenceGenerator(TradeRepository tradeRepository, ContractRepository contractRepository) {
        this.tradeRepository = tradeRepository;
        this.contractRepository = contractRepository;
    }

    public String nextTradeReference() {
        return nextReference("TRD", tradeRepository::countByTradeReferenceStartingWith,
                tradeRepository::existsByTradeReferenceIgnoreCase);
    }

    public String nextContractReference() {
        return nextReference("CTR", contractRepository::countByContractReferenceStartingWith,
                contractRepository::existsByContractReferenceIgnoreCase);
    }

    private String nextReference(String prefix,
                                 java.util.function.Function<String, Long> countByPrefix,
                                 java.util.function.Predicate<String> exists) {
        String yearPrefix = prefix + "-" + LocalDate.now().getYear() + "-";
        long start = countByPrefix.apply(yearPrefix) + 1;
        for (long sequence = start; sequence < start + MAX_ATTEMPTS; sequence++) {
            String candidate = yearPrefix + String.format("%04d", sequence);
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate a unique reference with prefix " + yearPrefix);
    }
}
