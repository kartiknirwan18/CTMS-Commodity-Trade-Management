package com.ctms.repository;

import com.ctms.entity.Commodity;
import com.ctms.entity.CommodityType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic filters for commodity searches.
 *
 * <p>Criteria specifications are used instead of JPQL "(:param IS NULL OR ...)"
 * conditions because the latter is fragile with enum and date parameters.</p>
 */
public final class CommoditySpecifications {

    private CommoditySpecifications() {
    }

    public static Specification<Commodity> withFilters(String query, Boolean active, CommodityType type) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(query)) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + query.trim().toLowerCase() + "%"));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
