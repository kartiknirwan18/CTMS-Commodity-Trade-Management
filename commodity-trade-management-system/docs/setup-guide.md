# CTMS - Local Setup Guide

Step-by-step instructions to run the **Commodity Trade Management System (CTMS)** on your machine.

CTMS is a learning / portfolio project that manages commodity master data, BUY/SELL trades, delivery contracts, and an **estimated** P&L dashboard.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Project structure](#2-project-structure)
3. [Quick start (no database, H2 profile)](#3-quick-start-no-database-h2-profile)
4. [Full setup with MySQL](#4-full-setup-with-mysql)
5. [Backend configuration](#5-backend-configuration)
6. [Running the backend](#6-running-the-backend)
7. [Running the frontend](#7-running-the-frontend)
8. [Verifying the setup](#8-verifying-the-setup)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Java (JDK) | 21 | required by Spring Boot 3.5.x |
| Maven | *not required* | the project ships a Maven wrapper (`mvnw` / `mvnw.cmd`) |
| MySQL | 8.x | only needed for the MySQL profile |
| Node.js | 18+ (20 LTS recommended) | for the frontend |
| npm | bundled with Node.js | |
| Git | any recent | optional |

Verify:

```bash
java -version
node --version
npm --version
mysql --version
```

---

## 2. Project structure

```
commodity-trade-management-system/
├── backend/                  # Spring Boot 3.5 + Java 21 REST API
│   ├── .env.example          # documents DB env vars (copy to .env)
│   ├── mvnw / mvnw.cmd       # Maven wrapper
│   └── src/
├── frontend/                 # React 18 + Vite + axios + recharts
│   └── src/
├── database/
│   ├── schema.sql            # MySQL 8 DDL
│   └── seed-data.sql         # idempotent sample data
├── docs/
│   ├── api-documentation.md
│   └── setup-guide.md
├── postman/
│   ├── CTMS.postman_collection.json
│   └── CTMS-local.postman_environment.json
└── README.md
```

---

## 3. Quick start (no database, H2 profile)

The fastest way to try the API without installing MySQL. The `h2` profile uses an in-memory H2 database and loads demo sample data automatically.

```bash
# from backend/
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"     # Windows PowerShell
# ./mvnw spring-boot:run -Dspring-boot.run.profiles=h2          # macOS / Linux
```

Then hit:

```bash
curl http://localhost:8080/api/health
```

You should see `{"status":"UP",...}`. The in-memory data resets on restart.

---

## 4. Full setup with MySQL

### 4.1 Install & start MySQL 8

Make sure the MySQL server is running and you know the `root` password.

### 4.2 Create the schema

From the project root:

```bash
mysql -u root -p < database/schema.sql
```

Or inside the MySQL client:

```sql
SOURCE database/schema.sql;
```

### 4.3 Load sample data

```bash
mysql -u root -p < database/seed-data.sql
```

Or:

```sql
SOURCE database/seed-data.sql;
```

Both scripts are **re-runnable** (`CREATE DATABASE IF NOT EXISTS`, `DROP TABLE IF EXISTS` in the correct order, and `INSERT ... ON DUPLICATE KEY UPDATE`), so you can execute them again at any time.

### 4.4 Verify

```sql
USE ctms;
SHOW TABLES;
-- Expect: commodities, contracts, trades
SELECT COUNT(*) FROM commodities;   -- 6
SELECT COUNT(*) FROM trades;        -- 20
SELECT COUNT(*) FROM contracts;     -- 6
```

---

## 5. Backend configuration

The Spring Boot app reads the following environment variables from `backend/application.properties`:

| Variable | Default | Required |
| --- | --- | --- |
| `CTMS_DB_URL` | `jdbc:mysql://localhost:3306/ctms?useSSL=false&serverTimezone=UTC&createDatabaseIfNotExist=true` | no |
| `CTMS_DB_USERNAME` | `root` | no |
| `CTMS_DB_PASSWORD` | *(none)* | **yes** for the MySQL profile |
| `CTMS_SERVER_PORT` | `8080` | no |

Copy the template and fill in real values:

```bash
# from backend/
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

> **Never commit `backend/.env`** - it is listed in `.gitignore`. Only `.env.example` (placeholders) belongs in version control.

Export the variables in your shell before starting the app (see next section), or load `.env` with your preferred tool.

---

## 6. Running the backend

From the `backend/` directory.

**Build**

```bash
.\mvnw.cmd clean package        # Windows PowerShell
./mvnw clean package            # macOS / Linux
```

**Run (MySQL profile)** - PowerShell example:

```powershell
$env:CTMS_DB_PASSWORD="yourpassword"
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
export CTMS_DB_PASSWORD=yourpassword
./mvnw spring-boot:run
```

**Run (H2 in-memory profile)** - no credentials needed:

```bash
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"
```

**Run tests**

```bash
.\mvnw.cmd test
```

The API will be available at <http://localhost:8080>, health check at <http://localhost:8080/api/health>.

---

## 7. Running the frontend

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to `http://localhost:8080`, so start the backend first.

> **Windows PowerShell tip:** if `npm` is blocked by the execution policy, use `npm.cmd` instead (e.g. `npm.cmd install`, `npm.cmd run dev`).

Production build and tests:

```bash
npm run build     # outputs to frontend/dist
npm test          # runs the test suite
```

---

## 8. Verifying the setup

```bash
# 1. Health
curl http://localhost:8080/api/health

# 2. List commodities
curl http://localhost:8080/api/commodities

# 3. Dashboard summary
curl http://localhost:8080/api/dashboard/summary
```

Import `postman/CTMS.postman_collection.json` and `postman/CTMS-local.postman_environment.json` into Postman and select the **CTMS - Local** environment to exercise every endpoint, including negative test cases.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Access denied for user 'root'@'localhost'` | wrong password / not set | set `CTMS_DB_PASSWORD` (PowerShell: `$env:CTMS_DB_PASSWORD="..."`) |
| `Communications link failure` | MySQL not running or wrong host/port | start MySQL; check `CTMS_DB_URL` |
| `Unknown database 'ctms'` | schema script not run | run `mysql -u root -p < database/schema.sql` |
| `Table 'ctms.trades' doesn't exist` | schema not applied to the right DB | run `schema.sql`, verify with `USE ctms; SHOW TABLES;` |
| `Foreign key constraint ... fails` while seeding | child rows inserted before parents | run `schema.sql` **then** `seed-data.sql` in order |
| `Port 8080 was already in use` | another process uses 8080 | set `CTMS_SERVER_PORT=8081` or stop the other process |
| Frontend calls fail / CORS or 404 | backend not running, or not on 8080 | start the backend; confirm the Vite proxy target is `http://localhost:8080` |
| `npm` is not recognized / execution policy error (Windows) | PowerShell script policy | use `npm.cmd` |
| Vite dev server port busy | 5173 in use | Vite auto-selects the next free port, or set `--port` |
| P&L shows `Not Available` | only buys, no matchable sells, or all non-confirmed | expected behaviour - see the P&L methodology in `docs/api-documentation.md` |
| `mvnw` not executable (macOS/Linux) | missing exec bit | `chmod +x mvnw` |

Still stuck? Delete the local database and start clean:

```sql
DROP DATABASE IF EXISTS ctms;
```

Then re-run `database/schema.sql` and `database/seed-data.sql`.
