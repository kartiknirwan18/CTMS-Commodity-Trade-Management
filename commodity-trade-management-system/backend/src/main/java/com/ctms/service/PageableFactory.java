package com.ctms.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Builds a safe {@link Pageable} from untrusted query parameters.
 *
 * <p>Size is capped and sort properties are validated against a whitelist so a
 * client cannot trigger a huge result set or a database error by sending an
 * unknown column name.</p>
 */
public final class PageableFactory {

    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 100;

    private PageableFactory() {
    }

    /**
     * @param page      zero based page index
     * @param size      requested page size
     * @param sortSpecs Spring style sort parameters, e.g. {@code ["tradeDate,desc"]}
     * @param allowed   entity property names that may be used for sorting
     * @param fallback  sort applied when no valid sort parameter was supplied
     */
    public static Pageable create(Integer page,
                                  Integer size,
                                  List<String> sortSpecs,
                                  Set<String> allowed,
                                  Sort fallback) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null || size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);

        List<Sort.Order> orders = new ArrayList<>();
        if (sortSpecs != null) {
            for (String spec : sortSpecs) {
                if (spec == null || spec.isBlank()) {
                    continue;
                }
                String[] parts = spec.split(",");
                String property = parts[0].trim();
                if (!allowed.contains(property)) {
                    continue;
                }
                boolean descending = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim());
                orders.add(descending ? Sort.Order.desc(property) : Sort.Order.asc(property));
            }
        }
        Sort sort = orders.isEmpty() ? fallback : Sort.by(orders);
        return PageRequest.of(safePage, safeSize, sort);
    }
}
