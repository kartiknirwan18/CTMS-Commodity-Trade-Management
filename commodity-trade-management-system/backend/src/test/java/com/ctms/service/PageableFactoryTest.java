package com.ctms.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link PageableFactory}: clamping, whitelisting and fallback
 * sorting of untrusted paging parameters.
 */
class PageableFactoryTest {

    private static final Set<String> ALLOWED = Set.of("id", "quantity", "tradeDate", "tradeReference");
    private static final Sort FALLBACK = Sort.by(Sort.Order.desc("tradeDate"), Sort.Order.desc("id"));

    @Test
    void nullPageAndSizeFallBackToDefaults() {
        Pageable pageable = PageableFactory.create(null, null, null, ALLOWED, FALLBACK);

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(PageableFactory.DEFAULT_SIZE);
        assertThat(pageable.getSort()).isEqualTo(FALLBACK);
    }

    @Test
    void sizeAboveMaximumIsClamped() {
        Pageable pageable = PageableFactory.create(0, PageableFactory.MAX_SIZE + 500, null, ALLOWED, FALLBACK);

        assertThat(pageable.getPageSize()).isEqualTo(PageableFactory.MAX_SIZE);
    }

    @Test
    void negativePageAndSizeUseSafeDefaults() {
        Pageable pageable = PageableFactory.create(-3, -7, null, ALLOWED, FALLBACK);

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(PageableFactory.DEFAULT_SIZE);
    }

    @Test
    void zeroSizeUsesDefaultSize() {
        Pageable pageable = PageableFactory.create(0, 0, null, ALLOWED, FALLBACK);

        assertThat(pageable.getPageSize()).isEqualTo(PageableFactory.DEFAULT_SIZE);
    }

    @Test
    void allowedSortSpecsProduceRequestedOrders() {
        Pageable pageable = PageableFactory.create(0, 20,
                List.of("quantity,desc", "tradeDate,asc"), ALLOWED, FALLBACK);

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(20);
        assertThat(pageable.getSort().toList()).containsExactly(
                Sort.Order.desc("quantity"),
                Sort.Order.asc("tradeDate"));
    }

    @Test
    void singleDescendingSortSpecIsApplied() {
        Pageable pageable = PageableFactory.create(0, 20, List.of("quantity,desc"), ALLOWED, FALLBACK);

        assertThat(pageable.getSort().toList()).containsExactly(Sort.Order.desc("quantity"));
    }

    @Test
    void sortSpecWithoutDirectionDefaultsToAscending() {
        Pageable pageable = PageableFactory.create(0, 20, List.of("tradeDate"), ALLOWED, FALLBACK);

        assertThat(pageable.getSort().toList()).containsExactly(Sort.Order.asc("tradeDate"));
    }

    @Test
    void propertyOutsideTheWhitelistIsIgnoredAndFallbackIsUsed() {
        Pageable pageable = PageableFactory.create(0, 20,
                List.of("password,desc"), ALLOWED, FALLBACK);

        assertThat(pageable.getSort()).isEqualTo(FALLBACK);
    }

    @Test
    void onlyWhitelistedPropertiesSurviveWhenMixed() {
        Pageable pageable = PageableFactory.create(0, 20,
                List.of("password,desc", "id,asc"), ALLOWED, FALLBACK);

        assertThat(pageable.getSort().toList()).containsExactly(Sort.Order.asc("id"));
    }

    @Test
    void emptySortListUsesFallback() {
        Pageable pageable = PageableFactory.create(0, 20, List.of(), ALLOWED, FALLBACK);

        assertThat(pageable.getSort()).isEqualTo(FALLBACK);
    }

    @Test
    void nullSortListUsesFallback() {
        Pageable pageable = PageableFactory.create(0, 20, null, ALLOWED, FALLBACK);

        assertThat(pageable.getSort()).isEqualTo(FALLBACK);
    }

    @Test
    void blankSortSpecIsIgnored() {
        Pageable pageable = PageableFactory.create(0, 20, List.of("  "), ALLOWED, FALLBACK);

        assertThat(pageable.getSort()).isEqualTo(FALLBACK);
    }
}
