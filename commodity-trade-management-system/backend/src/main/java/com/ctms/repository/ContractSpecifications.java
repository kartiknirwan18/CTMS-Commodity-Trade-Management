package com.ctms.repository;

import com.ctms.entity.Contract;
import com.ctms.entity.ContractStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic filters for the paginated contract search.
 */
public final class ContractSpecifications {

    private ContractSpecifications() {
    }

    public static Specification<Contract> withFilters(Long commodityId,
                                                      ContractStatus status,
                                                      String reference,
                                                      LocalDate from,
                                                      LocalDate to) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (commodityId != null) {
                predicates.add(cb.equal(root.get("commodity").get("id"), commodityId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (StringUtils.hasText(reference)) {
                predicates.add(cb.like(cb.lower(root.get("contractReference")),
                        "%" + reference.trim().toLowerCase() + "%"));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("contractDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("contractDate"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
