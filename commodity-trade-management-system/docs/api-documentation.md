# CTMS - REST API Documentation

**Commodity Trade Management System (CTMS)** - HTTP/JSON API reference.

> **Disclaimer:** P&L values returned by this API are **simplified estimates for demonstration purposes only**. They are **not** official accounting, tax, or financial advice. See [P&L methodology](#7-pnl-methodology).

---

## Table of contents

1. [Conventions](#1-conventions)
2. [Error handling](#2-error-handling)
3. [Health](#3-health)
4. [Commodities](#4-commodities)
5. [Trades](#5-trades)
6. [Contracts](#6-contracts)
7. [P&L methodology](#7-pnl-methodology)
8. [Dashboard](#8-dashboard)
9. [Business rules](#9-business-rules)
10. [Enum reference](#10-enum-reference)

---

## 1. Conventions

| Item | Value |
| --- | --- |
| Base URL | `http://localhost:8080` |
| API root | `/api` |
| Content type | `application/json` |
| Character encoding | UTF-8 |
| Date format | ISO-8601 date, `yyyy-MM-dd` (e.g. `2026-10-01`) |
| Date-time format | ISO-8601 local date-time, `yyyy-MM-dd'T'HH:mm:ss` (e.g. `2026-10-22T10:00:00`) |
| Money / quantity type | Decimal, 4 fractional digits (e.g. `78500.0000`) |
| Timestamps | Server local time (UTC when `serverTimezone=UTC` is set on the JDBC URL) |

All list endpoints that use pagination return a **page envelope**:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 42,
  "totalPages": 5,
  "first": true,
  "last": false
}
```

Common query parameters for paged endpoints:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | int | `0` | Zero-based page index |
| `size` | int | `10` (`20` for contracts) | Page size |
| `sort` | string | endpoint-specific | `field,asc` or `field,desc`, e.g. `sort=tradeDate,desc` |

---

## 2. Error handling

Errors are produced by a global `@ControllerAdvice` handler and always use the same body:

```json
{
  "timestamp": "2026-10-22T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/trades",
  "fieldErrors": [
    { "field": "quantity", "message": "Quantity must be greater than zero" }
  ]
}
```

`fieldErrors` is present for validation failures (400). For business-rule violations the message is human-readable and `fieldErrors` may be omitted or empty.

Validation error, with field details:

```json
{
  "timestamp": "2026-10-22T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/trades",
  "fieldErrors": [
    { "field": "quantity", "message": "Quantity must be greater than zero" }
  ]
}
```

Not-found error:

```json
{
  "timestamp": "2026-10-22T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Trade not found with id 9999",
  "path": "/api/trades/9999"
}
```

Conflict error (duplicate / dependent records / cancelled-record edit):

```json
{
  "timestamp": "2026-10-22T10:00:00",
  "status": 409,
  "error": "Conflict",
  "message": "Commodity name 'Crude Oil' already exists",
  "path": "/api/commodities"
}
```

### Status code summary

| Code | Meaning | Typical cause |
| --- | --- | --- |
| `200` | OK | Successful GET / PUT / PATCH |
| `201` | Created | Successful POST (returns `Location` header + created body) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Bean validation failure or business-rule violation |
| `404` | Not Found | Unknown id |
| `409` | Conflict | Duplicate name/reference, commodity in use, edit of a CANCELLED record |
| `500` | Internal Server Error | Unexpected server error |

---

## 3. Health

### `GET /api/health`

Liveness/readiness probe.

**Response `200 OK`**

```json
{
  "status": "UP",
  "application": "CTMS",
  "database": "MySQL",
  "timestamp": "2026-10-22T10:00:00"
}
```

`database` reports `MySQL` for the MySQL profile and may report the in-memory database name when running with the `h2` profile.

---

## 4. Commodities

### 4.1 `GET /api/commodities`

List commodities. Returns a plain array (not paginated).

**Query parameters**

| Param | Type | Description |
| --- | --- | --- |
| `q` | string | Case-insensitive substring match on `name` |
| `active` | boolean | Filter by active flag (`true` / `false`) |
| `type` | enum | Filter by commodity type (e.g. `ENERGY`) |

**Example:** `GET /api/commodities?q=oil&active=true&type=ENERGY`

**Response `200 OK`**

```json
[
  {
    "id": 1,
    "name": "Crude Oil",
    "type": "ENERGY",
    "unitOfMeasurement": "BARREL",
    "description": "Light sweet crude",
    "active": true,
    "createdAt": "2026-09-01T10:00:00"
  }
]
```

### 4.2 `GET /api/commodities/{id}`

**Response `200 OK`** - a single commodity object (same shape as above). `404` if unknown.

### 4.3 `POST /api/commodities`

**Request body**

```json
{
  "name": "Crude Oil",
  "type": "ENERGY",
  "unitOfMeasurement": "BARREL",
  "description": "Light sweet crude",
  "active": true
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | max 100 chars, unique (case-insensitive) |
| `type` | yes | enum, see [Enum reference](#10-enum-reference) |
| `unitOfMeasurement` | yes | enum |
| `description` | no | max 500 chars |
| `active` | no | defaults to `true` |

**Response `201 Created`** - the created commodity, with a `Location: /api/commodities/{id}` header.

**Errors:** `400` validation, `409` duplicate name.

### 4.4 `PUT /api/commodities/{id}`

Full update. Same body as `POST`. **Response `200 OK`** with the updated commodity. `404` if unknown, `409` if the new name collides with another commodity.

### 4.5 `PATCH /api/commodities/{id}/status`

Activate / deactivate a commodity.

**Request body**

```json
{ "active": true }
```

**Response `200 OK`** - the updated commodity.

### 4.6 `DELETE /api/commodities/{id}`

**Response `204 No Content`** on success.

**Errors:**
- `404` if unknown.
- `409` if the commodity has dependent trades or contracts (`"Commodity cannot be deleted because it is referenced by existing trades or contracts"`).

---

## 5. Trades

### 5.1 `GET /api/trades`

Paged list of trades.

**Query parameters**

| Param | Type | Description |
| --- | --- | --- |
| `page` | int | Zero-based page index (default `0`) |
| `size` | int | Page size (default `10`) |
| `sort` | string | e.g. `tradeDate,desc` (default) |
| `commodityId` | long | Filter by commodity |
| `tradeType` | enum | `BUY` or `SELL` |
| `status` | enum | `DRAFT`, `CONFIRMED`, `CANCELLED` |
| `from` | date | `tradeDate` >= `from` |
| `to` | date | `tradeDate` <= `to` |
| `reference` | string | Partial / exact `tradeReference` match |

**Example:** `GET /api/trades?page=0&size=10&sort=tradeDate,desc&commodityId=1&tradeType=BUY&status=CONFIRMED&from=2026-01-01&to=2026-12-31&reference=TRD-2026`

**Response `200 OK`**

```json
{
  "content": [
    {
      "id": 1,
      "tradeReference": "TRD-2026-0001",
      "commodityId": 1,
      "commodityName": "Crude Oil",
      "unitOfMeasurement": "BARREL",
      "tradeType": "BUY",
      "quantity": 1000.0000,
      "pricePerUnit": 78.5000,
      "totalValue": 78500.0000,
      "tradeDate": "2026-10-01",
      "counterparty": "Glencore",
      "contractId": null,
      "contractReference": null,
      "status": "CONFIRMED",
      "createdAt": "2026-10-01T09:12:00",
      "updatedAt": "2026-10-01T09:12:00"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 42,
  "totalPages": 5,
  "first": true,
  "last": false
}
```

`totalValue` is computed as `quantity × pricePerUnit`.

### 5.2 `GET /api/trades/{id}`

**Response `200 OK`** - a single trade object. `404` if unknown.

### 5.3 `POST /api/trades`

**Request body (`TradeRequest`)**

```json
{
  "tradeReference": "",
  "commodityId": 1,
  "tradeType": "BUY",
  "quantity": 1000,
  "pricePerUnit": 78.5,
  "tradeDate": "2026-10-01",
  "counterparty": "Glencore",
  "contractId": null,
  "status": "DRAFT"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `tradeReference` | no | blank/omitted -> server auto-generates `TRD-<year>-<sequence>`; if supplied it must be unique |
| `commodityId` | yes | must exist and be **active** |
| `tradeType` | yes | `BUY` or `SELL` |
| `quantity` | yes | must be > 0 |
| `pricePerUnit` | yes | must be >= 0 |
| `tradeDate` | yes | required, must not be in the future |
| `counterparty` | no | max 150 chars |
| `contractId` | no | if supplied, the contract must exist and reference the same commodity |
| `status` | no | defaults to `DRAFT` |

**Response `201 Created`** - the created trade, with a `Location` header.

**Errors:** `400` validation/business rule, `404` unknown commodity or contract, `409` duplicate reference.

### 5.4 `PUT /api/trades/{id}`

Full update. Same body as `POST`.

**Errors:** `400` validation, `404` unknown id, `409` duplicate reference or the trade is CANCELLED (cancelled trades can no longer be edited).

### 5.5 `PATCH /api/trades/{id}/status`

Cancel (or otherwise change) a trade's status.

**Request body**

```json
{ "status": "CANCELLED" }
```

**Response `200 OK`** - the updated trade.

> Records are **never hard-deleted**. Cancelling sets `status = CANCELLED`; a CANCELLED trade can no longer be edited (`409`).

### 5.6 `GET /api/trades/{id}/pnl`

Estimated P&L for a single trade's commodity, computed with FIFO cost basis.

**Response `200 OK`**

```json
{
  "tradeId": 1,
  "tradeReference": "TRD-2026-0001",
  "commodityId": 1,
  "commodityName": "Crude Oil",
  "unitOfMeasurement": "BARREL",
  "buyQuantity": 1000.0,
  "sellQuantity": 800.0,
  "matchedQuantity": 800.0,
  "openBuyQuantity": 200.0,
  "openSellQuantity": 0.0,
  "costBasisMethod": "FIFO",
  "realizedPnl": 4500.0000,
  "realizedPnlAvailable": true,
  "unrealizedPnl": null,
  "unrealizedPnlAvailable": false,
  "openPositionMessage": "200 BARREL buy position remains open.",
  "disclaimer": "Estimated P&L for demonstration purposes only."
}
```

When nothing can be matched (e.g. a commodity with only buys), `realizedPnlAvailable` is `false` and `realizedPnl` is `null` - never `0` presented as a real result.

---

## 6. Contracts

### 6.1 `GET /api/contracts`

Paged list of delivery contracts.

**Query parameters**

| Param | Type | Description |
| --- | --- | --- |
| `page` | int | default `0` |
| `size` | int | default `20` |
| `status` | enum | `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `commodityId` | long | Filter by commodity |
| `reference` | string | Partial / exact `contractReference` |
| `from` | date | `deliveryDate` >= `from` |
| `to` | date | `deliveryDate` <= `to` |

**Example:** `GET /api/contracts?page=0&size=20&status=ACTIVE&commodityId=1&reference=CTR-2026&from=2026-10-01&to=2026-11-30`

**Response `200 OK`**

```json
{
  "content": [
    {
      "id": 1,
      "contractReference": "CTR-2026-0001",
      "buyerName": "Vitol",
      "sellerName": "Trafigura",
      "commodityId": 1,
      "commodityName": "Crude Oil",
      "unitOfMeasurement": "BARREL",
      "contractQuantity": 5000.0000,
      "contractPrice": 76.2500,
      "contractValue": 381250.0000,
      "contractDate": "2026-09-01",
      "deliveryDate": "2026-10-15",
      "deliveryLocation": "Rotterdam",
      "status": "ACTIVE",
      "linkedTradeId": 12,
      "linkedTradeReference": "TRD-2026-0004",
      "createdAt": "2026-09-01T09:12:00",
      "updatedAt": "2026-09-01T09:12:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 6,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

`contractValue` is computed as `contractQuantity × contractPrice`.

### 6.2 `GET /api/contracts/{id}`

**Response `200 OK`** - a single contract. `404` if unknown.

### 6.3 `POST /api/contracts`

**Request body (`ContractRequest`)**

```json
{
  "contractReference": "",
  "buyerName": "Vitol",
  "sellerName": "Trafigura",
  "commodityId": 1,
  "contractQuantity": 5000,
  "contractPrice": 76.25,
  "contractDate": "2026-09-01",
  "deliveryDate": "2026-10-15",
  "deliveryLocation": "Rotterdam",
  "status": "DRAFT",
  "linkedTradeId": null
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `contractReference` | no | blank/omitted -> server auto-generates `CTR-<year>-<sequence>`; if supplied it must be unique |
| `buyerName` | yes | must differ from `sellerName` |
| `sellerName` | yes | must differ from `buyerName` |
| `commodityId` | yes | must exist |
| `contractQuantity` | yes | must be > 0 |
| `contractPrice` | yes | must be > 0 |
| `contractDate` | yes | required |
| `deliveryDate` | yes | required, must not be earlier than `contractDate` |
| `deliveryLocation` | no | max 150 chars |
| `status` | no | defaults to `DRAFT` |
| `linkedTradeId` | no | if supplied, the trade must exist and belong to the same commodity |

**Response `201 Created`** - the created contract, with a `Location` header.

**Errors:** `400` validation/business rule, `404` unknown commodity/trade, `409` duplicate reference.

### 6.4 `PUT /api/contracts/{id}`

Full update. Same body as `POST`. **Response `200 OK`** with the updated contract.

### 6.5 `GET /api/contracts/upcoming-deliveries`

Contracts whose `deliveryDate` falls within the next `days` days (default `30`).

**Query parameters**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `days` | int | `30` | Look-ahead window in days |

**Example:** `GET /api/contracts/upcoming-deliveries?days=30`

**Response `200 OK`**

```json
[
  {
    "contractId": 1,
    "contractReference": "CTR-2026-0001",
    "commodityName": "Crude Oil",
    "unitOfMeasurement": "BARREL",
    "contractQuantity": 5000.0000,
    "deliveryDate": "2026-10-15",
    "daysUntilDelivery": 5,
    "deliveryLocation": "Rotterdam",
    "buyerName": "Vitol",
    "sellerName": "Trafigura",
    "status": "ACTIVE"
  }
]
```

---

## 7. P&L methodology

> **This is a simplified, explicitly documented estimate.** It is provided for demonstration and learning purposes and is **not** official accounting, tax, or financial advice. Every P&L response carries a disclaimer.

**Cost basis:** FIFO (First-In, First-Out).

**Algorithm (per commodity *and* unit of measurement):**

1. Consider **only `CONFIRMED`** trades. `DRAFT` and `CANCELLED` trades are excluded.
2. Sort confirmed `BUY` trades by `tradeDate` ascending -> the FIFO buy queue (each lot carries `quantity` and `pricePerUnit`).
3. Walk confirmed `SELL` trades in `tradeDate` ascending order:
   - For each sell, consume buy lots from the front of the queue.
   - `realizedPnl += matchedQuantity × (sellPricePerUnit − buyLotPricePerUnit)` for each consumed chunk.
4. Quantities remaining in the buy queue form the **open buy position**; unmatched sell quantity forms the **open sell position**.

**Realized P&L = Σ over every match of `matchedQuantity × (sellPrice − matchedBuyCost)`.**

**Availability rules:**

- If at least one buy/sell pair can be matched -> `realizedPnlAvailable = true` and `realizedPnl` is the computed value.
- If nothing can be matched (no sells, or no overlapping quantities) -> `realizedPnlAvailable = false` and `realizedPnl` is `null`. **`0` is never presented as a genuine result.**

**Unrealized P&L:** always report as **"Not Available"** (`unrealizedPnl = null`, `unrealizedPnlAvailable = false`) because the system does not store market prices and therefore cannot mark open positions to market.

**Open position:** quantities that cannot be matched remain open and are described in `openPositionMessage` / `message` (e.g. `"200 BARREL buy position remains open."`).

**Example (illustrative):**

| Commodity | Confirmed buys (FIFO) | Confirmed sells | Matched | Realized P&L |
| --- | --- | --- | --- | --- |
| Crude Oil (BARREL) | 1000 @ 70.00, then 1200 @ 72.00 | 800 @ 75.00, then 1000 @ 78.00 | 800 @ 70.00; 200 @ 70.00; 800 @ 72.00 | 4000 + 1600 + 4800 = **10400.00** |
| Copper (METRIC_TON) | buys only | none | none | **Not Available** |

---

## 8. Dashboard

### 8.1 `GET /api/dashboard/summary`

High-level KPIs.

**Response `200 OK`**

```json
{
  "totalTrades": 20,
  "draftTrades": 2,
  "confirmedTrades": 16,
  "cancelledTrades": 2,
  "totalBuyTrades": 11,
  "totalSellTrades": 9,
  "totalTradeVolume": 15400.0000,
  "totalTradeValue": 1234567.8900,
  "realizedPnl": 45000.0000,
  "realizedPnlAvailable": true,
  "unrealizedPnl": null,
  "unrealizedPnlAvailable": false,
  "pnlMessage": "Realized P&L uses FIFO matching of confirmed buy and sell trades per commodity and unit.",
  "pnlDisclaimer": "Estimated P&L for demonstration purposes only - not official accounting or financial advice.",
  "totalCommodities": 6,
  "activeCommodities": 5,
  "activeContracts": 4,
  "upcomingDeliveries": 3,
  "upcomingDeliveryWindowDays": 30
}
```

### 8.2 `GET /api/dashboard/trade-volume`

Aggregated volume/value per commodity (confirmed trades recommended).

**Response `200 OK`**

```json
[
  {
    "commodityId": 1,
    "commodityName": "Crude Oil",
    "unitOfMeasurement": "BARREL",
    "tradeCount": 7,
    "buyQuantity": 4000.0,
    "sellQuantity": 3500.0,
    "totalQuantity": 7500.0,
    "totalValue": 588750.0
  }
]
```

### 8.3 `GET /api/dashboard/trade-activity`

Time-series of trade counts/values per month (for recharts line/bar charts).

**Query parameters**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `months` | int | `6` | Number of trailing months |

**Example:** `GET /api/dashboard/trade-activity?months=6`

**Response `200 OK`**

```json
[
  {
    "period": "2026-05",
    "label": "May 2026",
    "tradeCount": 4,
    "buyCount": 2,
    "sellCount": 2,
    "buyValue": 100000.0,
    "sellValue": 90000.0,
    "totalValue": 190000.0,
    "totalQuantity": 2500.0
  }
]
```

### 8.4 `GET /api/dashboard/pnl`

Per-commodity P&L plus an overall total.

**Response `200 OK`**

```json
{
  "items": [
    {
      "commodityId": 1,
      "commodityName": "Crude Oil",
      "unitOfMeasurement": "BARREL",
      "buyQuantity": 4000.0,
      "sellQuantity": 3500.0,
      "matchedQuantity": 3500.0,
      "openBuyQuantity": 500.0,
      "openSellQuantity": 0.0,
      "realizedPnl": 125000.0,
      "realizedPnlAvailable": true,
      "message": "3500 BARREL matched using FIFO; 500 BARREL buy position remains open."
    }
  ],
  "totalRealizedPnl": 125000.0,
  "realizedPnlAvailable": true,
  "costBasisMethod": "FIFO",
  "disclaimer": "Estimated P&L for demonstration purposes only."
}
```

---

## 9. Business rules

### Commodity

- `name` is required, unique (case-insensitive), max 100 characters.
- `type` and `unitOfMeasurement` are required enums.
- `active` defaults to `true`.
- A commodity referenced by any trade or contract cannot be deleted (`409`).

### Trade

- The referenced commodity must **exist and be active**.
- `tradeType` must be `BUY` or `SELL`.
- `quantity` must be **> 0**.
- `pricePerUnit` must be **>= 0**.
- `tradeDate` is required and **must not be in the future**.
- `tradeReference` is unique (server auto-generates if blank).
- Optional `contractId` must exist; a trade linked to a contract must reference the **same commodity** as the contract.
- Cancelling sets `status = CANCELLED`; records are **never hard-deleted**.
- A `CANCELLED` trade can **no longer be edited** (`409`).

### Contract

- `deliveryDate` must **not be earlier** than `contractDate`.
- `buyerName` and `sellerName` are required and must **differ**.
- `contractQuantity` must be **> 0** and `contractPrice` must be **> 0**.
- `contractReference` is unique (server auto-generates if blank).
- Optional `linkedTradeId` must exist and **belong to the same commodity**.

---

## 10. Enum reference

| Enum | Allowed values |
| --- | --- |
| Commodity `type` | `ENERGY`, `AGRICULTURE`, `METALS`, `LIVESTOCK`, `OTHER` |
| `unitOfMeasurement` | `BARREL`, `MMBTU`, `METRIC_TON`, `BUSHEL`, `GALLON`, `POUND`, `OTHER` |
| `tradeType` | `BUY`, `SELL` |
| Trade `status` | `DRAFT`, `CONFIRMED`, `CANCELLED` |
| Contract `status` | `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `costBasisMethod` | `FIFO` |
