-- ============================================================================
--  CTMS - Commodity Trade Management System
--  MySQL 8 sample / seed data
--  ---------------------------------------------------------------------------
--  Re-runnable: uses explicit primary keys together with
--  `INSERT ... ON DUPLICATE KEY UPDATE` so running it multiple times will not
--  fail and will not create duplicate rows.
--
--  Usage (from the project root), AFTER database/schema.sql:
--     mysql -u root -p < database/seed-data.sql
--  or, inside the MySQL client:
--     SOURCE database/seed-data.sql;
--
--  Dates are relative to the day the script is executed:
--   * trades use DATE_SUB(CURDATE(), INTERVAL n DAY)  -> spread over ~7 months
--   * contracts use DATE_ADD(CURDATE(), INTERVAL n DAY) for future deliveries
--     so the "upcoming deliveries" view always stays fresh.
-- ============================================================================

USE ctms;

-- ---------------------------------------------------------------------------
-- 1. Commodities (6) - Coffee is intentionally inactive to exercise the
--    "active" flag / filter behaviour.
-- ---------------------------------------------------------------------------
INSERT INTO commodities (id, name, type, unit_of_measurement, description, active)
VALUES
    (1, 'Crude Oil',    'ENERGY',      'BARREL',      'Light sweet crude oil (WTI)',        TRUE),
    (2, 'Natural Gas',  'ENERGY',      'MMBTU',       'Henry Hub natural gas',              TRUE),
    (3, 'Wheat',        'AGRICULTURE', 'METRIC_TON',  'Milling wheat, grade 2',             TRUE),
    (4, 'Corn',         'AGRICULTURE', 'BUSHEL',      'Yellow dent corn #2',                TRUE),
    (5, 'Copper',       'METALS',      'METRIC_TON',  'LME grade A copper cathode',         TRUE),
    (6, 'Coffee',       'AGRICULTURE', 'POUND',       'Arabica coffee beans (discontinued)', FALSE)
ON DUPLICATE KEY UPDATE
    name                = VALUES(name),
    type                = VALUES(type),
    unit_of_measurement = VALUES(unit_of_measurement),
    description         = VALUES(description),
    active              = VALUES(active);

-- ---------------------------------------------------------------------------
-- 2. Trades (20) - mixed BUY/SELL, DRAFT/CONFIRMED/CANCELLED.
--    contract_id is left NULL here and set further down (see step 4) to avoid
--    violating the FK before the contracts exist.
--
--    FIFO-matchable commodity (non-zero realized P&L): Crude Oil (id 1),
--    Natural Gas (2), Wheat (3), Corn (4).
--    Buy-only commodity (realized P&L "Not Available"): Copper (id 5).
-- ---------------------------------------------------------------------------
INSERT INTO trades
    (id, trade_reference, commodity_id, trade_type, quantity, price_per_unit, trade_date, counterparty, status)
VALUES
    -- Crude Oil (commodity 1 / BARREL)
    (1,  'TRD-2026-0001', 1, 'BUY',  1000.0000,   70.0000, DATE_SUB(CURDATE(), INTERVAL 200 DAY), 'Glencore',       'CONFIRMED'),
    (2,  'TRD-2026-0002', 1, 'SELL',  800.0000,   75.0000, DATE_SUB(CURDATE(), INTERVAL 150 DAY), 'Vitol',          'CONFIRMED'),
    (3,  'TRD-2026-0003', 1, 'BUY',  1200.0000,   72.0000, DATE_SUB(CURDATE(), INTERVAL  90 DAY), 'Trafigura',      'CONFIRMED'),
    (4,  'TRD-2026-0004', 1, 'SELL', 1000.0000,   78.0000, DATE_SUB(CURDATE(), INTERVAL  30 DAY), 'BP',             'CONFIRMED'),
    (5,  'TRD-2026-0005', 1, 'BUY',   500.0000,   74.0000, DATE_SUB(CURDATE(), INTERVAL  10 DAY), 'Shell',          'DRAFT'),
    (6,  'TRD-2026-0006', 1, 'SELL',  300.0000,   69.0000, DATE_SUB(CURDATE(), INTERVAL  40 DAY), 'TotalEnergies',  'CANCELLED'),

    -- Natural Gas (commodity 2 / MMBTU)
    (7,  'TRD-2026-0007', 2, 'BUY',  5000.0000,    2.5000, DATE_SUB(CURDATE(), INTERVAL 180 DAY), 'Cheniere',       'CONFIRMED'),
    (8,  'TRD-2026-0008', 2, 'SELL', 3000.0000,    3.1000, DATE_SUB(CURDATE(), INTERVAL 120 DAY), 'Uniper',         'CONFIRMED'),
    (9,  'TRD-2026-0009', 2, 'SELL', 1000.0000,    2.9000, DATE_SUB(CURDATE(), INTERVAL  60 DAY), 'Engie',          'CONFIRMED'),
    (10, 'TRD-2026-0010', 2, 'BUY',  2000.0000,    2.6000, DATE_SUB(CURDATE(), INTERVAL  20 DAY), 'Gazprom',        'DRAFT'),

    -- Wheat (commodity 3 / METRIC_TON)
    (11, 'TRD-2026-0011', 3, 'BUY',   500.0000,  250.0000, DATE_SUB(CURDATE(), INTERVAL 170 DAY), 'Cargill',        'CONFIRMED'),
    (12, 'TRD-2026-0012', 3, 'SELL',  200.0000,  275.0000, DATE_SUB(CURDATE(), INTERVAL 100 DAY), 'ADM',            'CONFIRMED'),
    (13, 'TRD-2026-0013', 3, 'BUY',   300.0000,  260.0000, DATE_SUB(CURDATE(), INTERVAL  50 DAY), 'Bunge',          'CONFIRMED'),
    (14, 'TRD-2026-0014', 3, 'SELL',  100.0000,  240.0000, DATE_SUB(CURDATE(), INTERVAL  15 DAY), 'Louis Dreyfus',  'CONFIRMED'),

    -- Corn (commodity 4 / BUSHEL)
    (15, 'TRD-2026-0015', 4, 'BUY',  2000.0000,    4.8000, DATE_SUB(CURDATE(), INTERVAL 160 DAY), 'Cargill',        'CONFIRMED'),
    (16, 'TRD-2026-0016', 4, 'SELL', 1500.0000,    5.2000, DATE_SUB(CURDATE(), INTERVAL  80 DAY), 'ADM',            'CONFIRMED'),
    (17, 'TRD-2026-0017', 4, 'SELL',  500.0000,    4.6000, DATE_SUB(CURDATE(), INTERVAL  70 DAY), 'Bunge',          'CANCELLED'),

    -- Copper (commodity 5 / METRIC_TON) - buys only, so realized P&L is N/A
    (18, 'TRD-2026-0018', 5, 'BUY',   300.0000, 8500.0000, DATE_SUB(CURDATE(), INTERVAL 140 DAY), 'Rio Tinto',      'CONFIRMED'),
    (19, 'TRD-2026-0019', 5, 'BUY',   200.0000, 8600.0000, DATE_SUB(CURDATE(), INTERVAL  45 DAY), 'Glencore',       'CONFIRMED'),
    (20, 'TRD-2026-0020', 5, 'BUY',   100.0000, 8400.0000, DATE_SUB(CURDATE(), INTERVAL   5 DAY), 'Vale',           'CONFIRMED')
ON DUPLICATE KEY UPDATE
    trade_reference = VALUES(trade_reference),
    commodity_id    = VALUES(commodity_id),
    trade_type      = VALUES(trade_type),
    quantity        = VALUES(quantity),
    price_per_unit  = VALUES(price_per_unit),
    trade_date      = VALUES(trade_date),
    counterparty    = VALUES(counterparty),
    status          = VALUES(status);

-- ---------------------------------------------------------------------------
-- 3. Contracts (6).
--    3 have delivery dates within the next 30 days (C1, C2, C3).
--    `linked_trade_id` points at an existing trade of the same commodity.
-- ---------------------------------------------------------------------------
INSERT INTO contracts
    (id, contract_reference, buyer_name, seller_name, commodity_id, contract_quantity, contract_price,
     contract_date, delivery_date, delivery_location, status, linked_trade_id)
VALUES
    (1, 'CTR-2026-0001', 'Vitol',       'Trafigura',       1,  5000.0000, 76.2500,
        DATE_SUB(CURDATE(), INTERVAL 60 DAY),  DATE_ADD(CURDATE(), INTERVAL  5 DAY), 'Rotterdam',    'ACTIVE',    1),
    (2, 'CTR-2026-0002', 'Cheniere',    'Gazprom',         2, 10000.0000,  2.7500,
        DATE_SUB(CURDATE(), INTERVAL 45 DAY),  DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'Zeebrugge',    'ACTIVE',    7),
    (3, 'CTR-2026-0003', 'Cargill',     'ADM',             3,  1000.0000, 255.0000,
        DATE_SUB(CURDATE(), INTERVAL 30 DAY),  DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Chicago',      'ACTIVE',   11),
    (4, 'CTR-2026-0004', 'Glencore',    'Rio Tinto',       5,   400.0000, 8700.0000,
        DATE_SUB(CURDATE(), INTERVAL 20 DAY),  DATE_ADD(CURDATE(), INTERVAL 75 DAY), 'Shanghai',     'DRAFT',    NULL),
    (5, 'CTR-2026-0005', 'Bunge',       'Louis Dreyfus',   4,  3000.0000,    5.0000,
        DATE_SUB(CURDATE(), INTERVAL 120 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY),'New Orleans',  'COMPLETED', 15),
    (6, 'CTR-2026-0006', 'Starbucks',   'Olam',            6, 40000.0000,    1.8500,
        DATE_SUB(CURDATE(), INTERVAL 15 DAY),  DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'Santos',       'CANCELLED', NULL)
ON DUPLICATE KEY UPDATE
    contract_reference = VALUES(contract_reference),
    buyer_name         = VALUES(buyer_name),
    seller_name        = VALUES(seller_name),
    commodity_id       = VALUES(commodity_id),
    contract_quantity  = VALUES(contract_quantity),
    contract_price     = VALUES(contract_price),
    contract_date      = VALUES(contract_date),
    delivery_date      = VALUES(delivery_date),
    delivery_location  = VALUES(delivery_location),
    status             = VALUES(status),
    linked_trade_id    = VALUES(linked_trade_id);

-- ---------------------------------------------------------------------------
-- 4. Link trades back to contracts (trades.contract_id).
--    A trade linked to a contract must reference the same commodity.
-- ---------------------------------------------------------------------------
UPDATE trades SET contract_id = 1 WHERE id = 1;
UPDATE trades SET contract_id = 2 WHERE id = 7;
UPDATE trades SET contract_id = 3 WHERE id = 11;
UPDATE trades SET contract_id = 5 WHERE id = 15;

-- ---------------------------------------------------------------------------
-- Quick verification (optional, run manually):
--   SELECT COUNT(*) AS trades FROM trades;              -- expected 20
--   SELECT COUNT(*) AS contracts FROM contracts;        -- expected 6
--   SELECT * FROM contracts ORDER BY delivery_date;
-- ---------------------------------------------------------------------------
