-- ============================================================================
--  CTMS - Commodity Trade Management System
--  MySQL 8 DDL script
--  ---------------------------------------------------------------------------
--  This script is re-runnable: it (re)creates the `ctms` schema and all tables.
--
--  Usage (from the project root):
--     mysql -u root -p < database/schema.sql
--  or, inside the MySQL client:
--     SOURCE database/schema.sql;
--
--  Notes:
--   * All quantities / prices / money use DECIMAL(18,4) - never FLOAT/DOUBLE.
--   * Primary keys are BIGINT AUTO_INCREMENT.
--   * `trades.contract_id` and `contracts.linked_trade_id` reference each other
--     (circular relationship), so the two cross-referencing foreign keys are
--     added with ALTER TABLE statements at the very end of this script.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ctms
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE ctms;

-- ---------------------------------------------------------------------------
-- Drop existing tables (FK-safe order).
-- `trades` and `contracts` reference each other, so foreign key checks are
-- disabled while dropping to avoid ordering problems on re-runs.
-- ---------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS commodities;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Table: commodities
-- ---------------------------------------------------------------------------
CREATE TABLE commodities (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    name                VARCHAR(100) NOT NULL,
    type                VARCHAR(30)  NOT NULL,               -- ENERGY, AGRICULTURE, METALS, LIVESTOCK, OTHER
    unit_of_measurement VARCHAR(30)  NOT NULL,               -- BARREL, MMBTU, METRIC_TON, BUSHEL, GALLON, POUND, OTHER
    description         VARCHAR(500) NULL,
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_commodities_name UNIQUE (name),
    INDEX idx_commodities_name (name)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Table: contracts
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    contract_reference VARCHAR(40)   NOT NULL,
    buyer_name         VARCHAR(150)  NOT NULL,
    seller_name        VARCHAR(150)  NOT NULL,
    commodity_id       BIGINT        NOT NULL,
    contract_quantity  DECIMAL(18,4) NOT NULL,
    contract_price     DECIMAL(18,4) NOT NULL,
    contract_date      DATE          NOT NULL,
    delivery_date      DATE          NOT NULL,
    delivery_location  VARCHAR(150)  NULL,
    status             VARCHAR(20)   NOT NULL,               -- DRAFT, ACTIVE, COMPLETED, CANCELLED
    linked_trade_id    BIGINT        NULL,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_contracts_reference UNIQUE (contract_reference),
    CONSTRAINT fk_contracts_commodity FOREIGN KEY (commodity_id) REFERENCES commodities (id),
    INDEX idx_contracts_status (status),
    INDEX idx_contracts_delivery_date (delivery_date),
    INDEX idx_contracts_commodity (commodity_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Table: trades
-- ---------------------------------------------------------------------------
CREATE TABLE trades (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    trade_reference VARCHAR(40)   NOT NULL,
    commodity_id    BIGINT        NOT NULL,
    trade_type      VARCHAR(10)   NOT NULL,                  -- BUY, SELL
    quantity        DECIMAL(18,4) NOT NULL,
    price_per_unit  DECIMAL(18,4) NOT NULL,
    trade_date      DATE          NOT NULL,
    counterparty    VARCHAR(150)  NULL,
    contract_id     BIGINT        NULL,
    status          VARCHAR(20)   NOT NULL,                  -- DRAFT, CONFIRMED, CANCELLED
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_trades_reference UNIQUE (trade_reference),
    CONSTRAINT fk_trades_commodity FOREIGN KEY (commodity_id) REFERENCES commodities (id),
    INDEX idx_trades_trade_date (trade_date),
    INDEX idx_trades_status (status),
    INDEX idx_trades_commodity (commodity_id),
    INDEX idx_trades_reference (trade_reference)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Circular cross-referencing foreign keys (added after both tables exist).
-- ---------------------------------------------------------------------------
ALTER TABLE trades
    ADD CONSTRAINT fk_trades_contract
        FOREIGN KEY (contract_id) REFERENCES contracts (id);

ALTER TABLE contracts
    ADD CONSTRAINT fk_contracts_linked_trade
        FOREIGN KEY (linked_trade_id) REFERENCES trades (id);

-- ---------------------------------------------------------------------------
-- Verification helpers (optional, run manually):
--   USE ctms;
--   SHOW TABLES;
--   SHOW CREATE TABLE trades;
-- ---------------------------------------------------------------------------
