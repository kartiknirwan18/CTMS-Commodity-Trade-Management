package com.ctms.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Money/quantity helpers. All monetary and quantity values are kept at 4
 * decimal places to match the {@code DECIMAL(18,4)} columns and to avoid the
 * rounding surprises of floating point arithmetic.
 */
public final class Numbers {

    public static final int SCALE = 4;

    private Numbers() {
    }

    public static BigDecimal zero() {
        return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal orZero(BigDecimal value) {
        return value == null ? zero() : value;
    }

    public static BigDecimal toScale(BigDecimal value) {
        return value == null ? null : value.setScale(SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal scaledOrZero(BigDecimal value) {
        return orZero(value).setScale(SCALE, RoundingMode.HALF_UP);
    }
}
