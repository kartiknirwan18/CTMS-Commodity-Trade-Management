package com.ctms.entity;

/**
 * Unit in which a commodity is traded. Quantities of two trades can only be
 * netted against each other when they share both commodity and unit.
 */
public enum UnitOfMeasurement {
    BARREL,
    MMBTU,
    METRIC_TON,
    BUSHEL,
    GALLON,
    POUND,
    OTHER
}
