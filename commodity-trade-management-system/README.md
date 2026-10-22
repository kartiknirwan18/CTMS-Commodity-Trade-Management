# CTMS - Commodity Trade Management System

A full-stack **learning / portfolio project** for managing commodity master data, BUY/SELL trades, delivery contracts, and an **estimated** Profit & Loss dashboard.

> **P&L is an estimate.** Realized P&L is computed with a simplified FIFO (First-In, First-Out) matching of confirmed trades per commodity. It is **not** official accounting, tax, or financial advice. Every P&L response carries this disclaimer.

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Installation](#installation)
8. [Database setup](#database-setup)
9. [Environment variables](#environment-variables)
10. [Running the application](#running-the-application)
11. [API summary](#api-summary)
12. [Example requests](#example-requests)
13. [Testing](#testing)
14. [Troubleshooting](#troubleshooting)
15. [P&L methodology](#pnl-methodology)

---

## Overview

CTMS is a small, self-contained reference application that demonstrates a typical trading back-office slice:

- **Commodity master data** - name, type, unit of measurement, active flag.
- **Trades** - BUY/SELL records tied to a commodity, with lifecycle `DRAFT → CONFIRMED` or `CANCELLED`.
- **Delivery contracts** - buyer/seller agreements with delivery dates and optional links to trades.
- **Dashboard** - KPIs, trade volume, monthly activity, and an **estimated** FIFO P&L.

The backend is a Spring Boot 3 REST API backed by MySQL 8 (with an H2 in-memory profile for credential-free local runs and tests). The frontend is a React 18 + Vite single-page app that consumes the API and renders charts with recharts.

This project exists to demonstrate backend design (JPA entities, validation, error handling, DTO mapping), SQL schema design, API documentation, and a clean full-stack workflow. It is **not** intended for production or real trading.

---

## Features

- CRUD for commodities with filtering (`q`, `active`, `type`) and soft activation (`PATCH /status`).
- Trade management with paged/filtered listing, auto-generated references, status transitions, and no hard deletes.
- Contract management with delivery scheduling and an **upcoming deliveries** view (default 30-day window).
- Dashboard aggregates: summary KPIs, trade volume per commodity, monthly trade activity, per-commodity P&L.
- Bean Validation + a global `@ControllerAdvice` producing a consistent JSON error body with `fieldErrors`.
- Idempotent SQL scripts (`schema.sql`, `seed-data.sql`) and a complete Postman collection with negative tests.
- Two database profiles: **MySQL 8** (default) and **H2 in-memory** (tests / quick demo).

---

## Architecture

```
                         ┌──────────────────────────────┐
                         │        Browser (SPA)         │
                         │  React 18 + Vite + axios     │
                         │  recharts dashboards         │
                         └───────────────┬──────────────┘
                                         │ HTTP/JSON
                                         │  /api  (Vite dev proxy → :8080)
                                         ▼
                         ┌──────────────────────────────┐
                         │   Spring Boot 3 REST API     │
                         │  Controller → Service → Repo  │
                         │  Bean Validation              │
                         │  @ControllerAdvice errors     │
                         │  Spring Data JPA / Hibernate  │
                         └───────────────┬──────────────┘
                                         │ JDBC
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
            ┌────────────────────┐              ┌────────────────────┐
            │   MySQL 8 (ctms)   │              │  H2 in-memory      │
            │  commodities       │              │  (profile: h2)     │
            │  trades            │              │  tests / quick run │
            │  contracts         │              └────────────────────┘
            └────────────────────┘
```

Backend default port `8080`; frontend dev server port `5173` (proxies `/api` to `8080`).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | Java 21 |
| Framework | Spring Boot 3.5.16 |
| Persistence | Spring Data JPA / Hibernate |
| Validation | Jakarta Bean Validation |
| Build | Maven 3.9+ |
| Database | MySQL 8 (`ctms` schema); H2 in-memory for the `h2` profile |
| Frontend | React 18 + Vite |
| Frontend HTTP | axios |
| Charts | recharts |
| API testing | Postman (collection + environment provided) |

---

## Project structure

```
commodity-trade-management-system/
├── backend/                       # Spring Boot 3.5 API (Java 21)
│   ├── .env.example               # DB env var template (copy to .env)
│   └── src/
├── frontend/                      # React 18 + Vite SPA
│   └── src/
├── database/
│   ├── schema.sql                 # MySQL 8 DDL (tables, FKs, indexes)
│   └── seed-data.sql              # idempotent sample data
├── docs/
│   ├── api-documentation.md       # full endpoint reference
│   └── setup-guide.md             # step-by-step local setup
├── postman/
│   ├── CTMS.postman_collection.json        # Postman v2.1 collection
│   └── CTMS-local.postman_environment.json # baseUrl = http://localhost:8080
├── .gitignore
└── README.md
```

---

## Prerequisites

| Tool | Version |
| --- | --- |
| Java (JDK) | 21+ (verified with JDK 27; the source/target release is 21) |
| Maven | 3.9+ (verified with 3.9.9) |
| MySQL | 8.x (only for the MySQL profile) |
| Node.js | 18+ (20 LTS recommended) |
| npm | bundled with Node.js |
| Postman | optional, for API exploration |

> There is no Maven Wrapper checked in, so `mvn` must be on your `PATH`.

---

## Installation

```bash
git clone <your-fork-or-repo-url> commodity-trade-management-system
cd commodity-trade-management-system
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

The backend downloads its dependencies automatically on first Maven build.

---

## Database setup

**Option A - MySQL 8 (default profile)**

```bash
# from the project root
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed-data.sql
```

Or inside the MySQL client:

```sql
SOURCE database/schema.sql;
SOURCE database/seed-data.sql;
```

Verify:

```sql
USE ctms;
SHOW TABLES;   -- commodities, contracts, trades
SELECT COUNT(*) FROM commodities;   -- 6
SELECT COUNT(*) FROM trades;        -- 20
SELECT COUNT(*) FROM contracts;     -- 6
```

**Option B - H2 in-memory (no database install)**

Just run the backend with the `h2` profile (see below). Sample data is loaded automatically and reset on each restart.

Both SQL scripts are **re-runnable**.

---

## Environment variables

The backend reads these variables (via `backend/application.properties`):

| Variable | Default | Required |
| --- | --- | --- |
| `CTMS_DB_URL` | `jdbc:mysql://localhost:3306/ctms?useSSL=false&serverTimezone=UTC&createDatabaseIfNotExist=true` | no |
| `CTMS_DB_USERNAME` | `root` | no |
| `CTMS_DB_PASSWORD` | *(none)* | **yes** for the MySQL profile |
| `CTMS_SERVER_PORT` | `8080` | no |

Copy the template and fill in real values (never commit the real `.env`):

```bash
cd backend
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

PowerShell example:

```powershell
$env:CTMS_DB_PASSWORD="yourpassword"
```

---

## Running the application

### Backend (MySQL profile) - from `backend/`

```bash
mvn clean package            # build (produces target/commodity-trade-management-system-1.0.0.jar)
mvn spring-boot:run          # run
```

Windows PowerShell with the DB password inline:

```powershell
$env:CTMS_DB_PASSWORD="yourpassword"; mvn spring-boot:run
```

### Backend (H2 profile - quickest way to try it, no MySQL)

```bash
mvn spring-boot:run "-Dspring-boot.run.profiles=h2"
```

The API is now at <http://localhost:8080>; health check at <http://localhost:8080/api/health>.

### Frontend - from `frontend/`

```bash
npm install
npm run dev        # http://localhost:5173  (proxies /api → http://localhost:8080)
```

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` (e.g. `npm.cmd run dev`).

Production build:

```bash
npm run build
```

> Start the backend before the frontend so the `/api` proxy has a target.

---

## API summary

Base URL `http://localhost:8080`, all paths under `/api`. Full details in [`docs/api-documentation.md`](docs/api-documentation.md).

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness probe |
| GET | `/api/commodities` | List commodities (`q`, `active`, `type`) |
| GET | `/api/commodities/{id}` | Get one commodity |
| POST | `/api/commodities` | Create commodity (201) |
| PUT | `/api/commodities/{id}` | Update commodity |
| PATCH | `/api/commodities/{id}/status` | Activate / deactivate |
| DELETE | `/api/commodities/{id}` | Delete (204 or 409 if in use) |
| GET | `/api/trades` | Paged/filtered trades (`page`,`size`,`sort`,`commodityId`,`tradeType`,`status`,`from`,`to`,`reference`) |
| GET | `/api/trades/{id}` | Get one trade |
| POST | `/api/trades` | Create trade (201) |
| PUT | `/api/trades/{id}` | Update trade |
| PATCH | `/api/trades/{id}/status` | Change status (e.g. cancel) |
| GET | `/api/trades/{id}/pnl` | Estimated FIFO P&L for one trade |
| GET | `/api/contracts` | Paged/filtered contracts (`page`,`size`,`status`,`commodityId`,`reference`,`from`,`to`) |
| GET | `/api/contracts/{id}` | Get one contract |
| POST | `/api/contracts` | Create contract (201) |
| PUT | `/api/contracts/{id}` | Update contract |
| GET | `/api/contracts/upcoming-deliveries?days=30` | Upcoming deliveries |
| GET | `/api/dashboard/summary` | Dashboard KPIs |
| GET | `/api/dashboard/trade-volume` | Volume/value per commodity |
| GET | `/api/dashboard/trade-activity?months=6` | Monthly activity time-series |
| GET | `/api/dashboard/pnl` | Per-commodity estimated P&L |

**Status codes:** `200`, `201`, `204`, `400` (validation / business rule), `404` (not found), `409` (duplicate reference/name, dependent records, cancelled-record edits), `500`.

**Error body:**

```json
{
  "timestamp": "2026-10-22T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/trades",
  "fieldErrors": [{ "field": "quantity", "message": "Quantity must be greater than zero" }]
}
```

---

## Example requests

Create a commodity:

```bash
curl -i -X POST http://localhost:8080/api/commodities \
  -H "Content-Type: application/json" \
  -d '{"name":"Crude Oil","type":"ENERGY","unitOfMeasurement":"BARREL","description":"Light sweet crude","active":true}'
```

List commodities:

```bash
curl "http://localhost:8080/api/commodities?q=oil&active=true&type=ENERGY"
```

Create a trade (blank reference is auto-generated as `TRD-<year>-<sequence>`):

```bash
curl -i -X POST http://localhost:8080/api/trades \
  -H "Content-Type: application/json" \
  -d '{"tradeReference":"","commodityId":1,"tradeType":"BUY","quantity":1000,"pricePerUnit":78.5,"tradeDate":"2026-10-01","counterparty":"Glencore","contractId":null,"status":"DRAFT"}'
```

List trades with filters and paging:

```bash
curl "http://localhost:8080/api/trades?page=0&size=10&sort=tradeDate,desc&commodityId=1&tradeType=BUY&status=CONFIRMED&from=2026-01-01&to=2026-12-31&reference=TRD-2026"
```

Cancel a trade:

```bash
curl -i -X PATCH http://localhost:8080/api/trades/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"CANCELLED"}'
```

Get trade P&L:

```bash
curl http://localhost:8080/api/trades/1/pnl
```

Create a contract:

```bash
curl -i -X POST http://localhost:8080/api/contracts \
  -H "Content-Type: application/json" \
  -d '{"contractReference":"","buyerName":"Vitol","sellerName":"Trafigura","commodityId":1,"contractQuantity":5000,"contractPrice":76.25,"contractDate":"2026-09-01","deliveryDate":"2026-10-15","deliveryLocation":"Rotterdam","status":"DRAFT","linkedTradeId":null}'
```

Upcoming deliveries:

```bash
curl "http://localhost:8080/api/contracts/upcoming-deliveries?days=30"
```

Dashboard summary:

```bash
curl http://localhost:8080/api/dashboard/summary
```

---

## Testing

Backend unit + integration tests (JUnit 5, Mockito, MockMvc, H2) - 98 tests, all green:

```bash
cd backend
mvn test
```

The suite covers the FIFO P&L matcher, the service layer (Mockito), the Bean Validation
rules (including the cross-field delivery-date rule), `@DataJpaTest` repository tests
against H2, and `@SpringBootTest` + MockMvc REST tests for every endpoint (success and
failure paths). `pom.xml` adds `**/*IT.java` to Surefire's includes so a single
`mvn test` runs both the `*Test` and `*IT` classes.

Frontend tests (Vitest + Testing Library) - 48 tests, all green:

```bash
cd frontend
npm test                              # or: npm.cmd test
```

API / end-to-end (Postman):

1. Start the backend.
2. Import `postman/CTMS.postman_collection.json` and `postman/CTMS-local.postman_environment.json`.
3. Select the **CTMS - Local** environment.
4. Run the folders in order: **Health → Commodities → Trades → Contracts → Dashboard**.
   The create requests capture `commodityId`, `tradeId`, `contractId` automatically, and the collection includes negative tests (duplicate name → 409, quantity 0 → 400, delivery date before contract date → 400, unknown id → 404).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Access denied for user 'root'@'localhost'` | wrong / missing password | set `CTMS_DB_PASSWORD` |
| `Communications link failure` | MySQL not running | start MySQL; check `CTMS_DB_URL` |
| `Unknown database 'ctms'` | schema not created | run `database/schema.sql` |
| `Table 'ctms.trades' doesn't exist` | schema not applied | run `database/schema.sql`, verify `USE ctms; SHOW TABLES;` |
| FK error while seeding | wrong script order | run `schema.sql` **then** `seed-data.sql` |
| `Port 8080 was already in use` | port conflict | set `CTMS_SERVER_PORT` or stop the other process |
| Frontend `/api` calls fail | backend down / not on 8080 | start backend; confirm the Vite proxy target |
| `npm` blocked (Windows) | PowerShell execution policy | use `npm.cmd` |
| `mvn` not found | Maven not installed / not on `PATH` | install Maven 3.9+ |
| Vite picks a different port | 5173 already in use | check the console output; the app is served on the port Vite prints (the `/api` proxy still targets 8080) |
| P&L shows `Not Available` | only buys / no matchable sells / no confirmed trades | expected - see below |

---

## P&L methodology

> **Estimated P&L for demonstration purposes only - not official accounting or financial advice.**

- **Cost basis:** FIFO (First-In, First-Out).
- **Scope:** only `CONFIRMED` trades. `DRAFT` and `CANCELLED` trades are excluded.
- **Matching:** confirmed BUY lots are consumed oldest-first against confirmed SELL trades, **per commodity and unit of measurement**.
- **Realized P&L** = Σ over each match of `matchedQuantity × (sellPrice − matchedBuyCost)`.
- **Unmatched quantity** stays an **open position** and is described in the response message.
- **Unrealized P&L** is always reported as **"Not Available"** because the system does not store market prices.
- If nothing can be matched, realized P&L is **"Not Available"** (`null`), never presented as `0`.

See [`docs/api-documentation.md`](docs/api-documentation.md#7-pnl-methodology) for the full algorithm and worked example.

---

## License / intent

This is a **learning and portfolio project** built for demonstration. It is not production-ready and must not be used to make real trading or financial decisions.
