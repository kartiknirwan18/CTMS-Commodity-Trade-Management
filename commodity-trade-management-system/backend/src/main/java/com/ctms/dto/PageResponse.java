package com.ctms.dto;

import java.util.List;

/**
 * Small, front-end friendly wrapper around Spring Data's {@code Page}.
 * Keeping our own shape means the JSON contract does not change when Spring
 * Data changes the serialisation of {@code Page}.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalElements / (double) size);
        return new PageResponse<>(
                content,
                page,
                size,
                totalElements,
                totalPages,
                page <= 0,
                page >= totalPages - 1
        );
    }
}
