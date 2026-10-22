package com.ctms.repository;

import com.ctms.entity.Trade;
import com.ctms.entity.TradeStatus;
import com.ctms.entity.TradeType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic filters for the paginated trade search:
 * commodity, trade type, status, date range and (partial) reference number.
 */
public final class TradeSpecifications {

    private TradeSpecifications() {
    }

    public static Specification<Trade> withFilters(Long commodityId,
                                                   TradeType tradeType,
                                                   TradeStatus status,
                                                   LocalDate from,
                                                   LocalDate to,
                                                   String reference) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (commodityId != null) {
                predicates.add(cb.equal(root.get("commodity").get("id"), commodityId));
            }
            if (tradeType != null) {
                predicates.add(cb.equal(root.get("tradeType"), tradeType));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("tradeDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("tradeDate"), to));
            }
            if (StringUtils.hasText(reference)) {
                predicates.add(cb.like(cb.lower(root.get("tradeReference")),
                        "%" + reference.trim().toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
