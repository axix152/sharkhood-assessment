# Sharkhood Tech — Provider Data Factory

A production-grade, highly resilient backend service built with **NestJS 11, MongoDB, Redis, and BullMQ** to ingest raw, denormalized reference data from third-party delivery providers and transform it into a clean, normalized, well-indexed domain model.

---

## 📋 Table of Contents
- [Quick Start with Docker Compose](#quick-start-with-docker-compose)
- [Local Development Setup](#local-development-setup)
- [Data Seeding](#data-seeding)
- [Running the Factory & API Surface](#running-the-factory--api-surface)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Testing Suite](#testing-suite)
- [Known Gaps & Next Steps](#known-gaps--next-steps)

---

## ⚡ Quick Start with Docker Compose

Reproduce the entire environment with a single command:

```bash
# 1. Bring up MongoDB, Redis, and the Provider Data Factory service
docker compose up -d

# 2. Seed the read-only staging database with the 3 sample provider collections
docker compose exec app npm run seed

# 3. Trigger an ingestion run via the API
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{"provider": "talabat", "batchSize": 50}'
```

Verify service liveness:
```bash
curl http://localhost:3000/health
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js >= 20 (Tested on Node.js v22)
- MongoDB instance running on `localhost:27017`
- Redis instance running on `localhost:6379`

### Installation & Environment
```bash
# Clone the repository
git clone https://github.com/axix152/sharkhood-assessment.git
cd sharkhood-assessment

# Install dependencies
npm install

# Copy configuration (validated against Zod schema)
cp .env.example .env
```

### Environment Schema Validation
The service uses schema-validated configuration (`src/config/env.schema.ts`). If any required environment variable is missing or malformed, the process **refuses to boot** and outputs formatted error diagnostic logs.

---

## 🌾 Data Seeding

The sample files are stored in `data/raw/`:
- `data/raw/compero-xbyte.xbyte-raw-locations.json`
- `data/raw/compero-xbyte.xbyte-raw-restaurants.json`
- `data/raw/compero-xbyte.xbyte-raw-menus.json`

To populate the staging database (`provider_raw`):
```bash
npm run seed
```
*Note: The raw database is treated as strictly read-only by the ingestion engine. The factory never mutates its source collections.*

---

## 🚀 Running the Factory & API Surface

### Start the application
```bash
# Development watch mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Endpoints Overview

#### 1. `POST /runs` — Trigger an Ingestion Run
Starts an asynchronous factory run via BullMQ.

```bash
curl -X POST http://localhost:3000/runs \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "talabat",
    "batchSize": 50
  }'
```

**Response (HTTP 202 Accepted):**
```json
{
  "runId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "PENDING",
  "message": "Ingestion run '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' has been queued."
}
```

#### 2. `GET /runs/:id` — Status and Counters
Inspect real-time counters across every stage (`read`, `transformed`, `written`, `skipped`, `failed`), timings, and error samples.

```bash
curl http://localhost:3000/runs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

**Response:**
```json
{
  "runId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "provider": "talabat",
  "status": "COMPLETED",
  "counters": {
    "read": 578,
    "transformed": 423,
    "written": 423,
    "skipped": 0,
    "failed": 155
  },
  "collectionCounters": {
    "raw_menus": { "read": 500, "transformed": 345, "written": 345, "skipped": 0, "failed": 155 },
    "raw_restaurants": { "read": 70, "transformed": 69, "written": 69, "skipped": 0, "failed": 1 },
    "raw_locations": { "read": 8, "transformed": 8, "written": 8, "skipped": 0, "failed": 0 }
  },
  "durationMs": 4280,
  "errorsSample": [
    {
      "sourceCollection": "raw_menus",
      "stage": "VALIDATION",
      "reason": "Boundary validation failed: Scraper error: This is not restaurant page (Talabat)."
    }
  ]
}
```

#### 3. `GET /runs/:id/errors` — Paginated Quarantine Log
Queries quarantined records with pagination and optional stage filtering.

```bash
curl "http://localhost:3000/runs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/errors?page=1&limit=10&stage=VALIDATION"
```

**Response:**
```json
{
  "data": [
    {
      "runId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "jobId": "12",
      "provider": "talabat",
      "sourceCollection": "raw_menus",
      "sourceId": "6aa77f3d2ba6464eb6cb9d5e",
      "stage": "VALIDATION",
      "reason": "Scraper error: This is not restaurant page (Talabat).",
      "rawPayload": { "statusCode": 200, "payload": { "Message": "This is not restaurant page (Talabat)." } },
      "createdAt": "2026-10-21T18:50:00.000Z"
    }
  ],
  "total": 155,
  "page": 1,
  "limit": 10
}
```

#### 4. `GET /health` — Liveness Check
Checks connection status and latency for Raw MongoDB, Target MongoDB, and Redis.

```bash
curl http://localhost:3000/health
```

---

## 🏗️ Architecture & Design Decisions

Detailed architectural rationale and data model analysis can be found in [ARCHITECTURE.md](ARCHITECTURE.md).

### Key Architectural Highlights:
1. **Hexagonal Architecture & Persistence Ports**:
   - The core transformation pipeline and business services interact exclusively with repository port interfaces (`ILocationRepository`, `IRestaurantRepository`, `IMenuItemRepository`, `IRunRepository`, `IQuarantineRepository`).
   - Mongoose schemas and queries are encapsulated in the domain persistence layer. Swapping Mongoose for Prisma or the native MongoDB driver has zero impact on the transformation engine.
2. **Provider-Agnostic Core Seam**:
   - Adding a new provider (e.g. `Deliveroo`, `UberEats`) requires writing an adapter (`IProviderAdapter`), declarative field mappings, and boundary schemas. The pipeline engine, queue worker, and dispatcher require zero changes.
3. **Idempotency & Resumability**:
   - Target collections enforce compound natural keys: `(provider, providerLocationId)`, `(provider, providerRestaurantId)`, `(provider, providerRestaurantId, providerItemId)`.
   - All writes use `bulkWrite` with `updateOne` and `upsert: true`.
   - If a worker dies mid-run, BullMQ re-delivers the job; re-processing yields the exact same target state with zero duplicates and zero counter drift.
4. **Honest Quarantine Handling**:
   - Out of 500 raw menu documents, **155 (31%)** contain scraper failures (`"This is not restaurant page (Talabat)."`).
   - Rather than silently dropping or crashing, these documents are quarantined at the `ValidationStep` with full context (`runId`, `jobId`, `sourceId`, `rawPayload`, `reason`).

---

## 🧪 Testing Suite

The project includes unit tests for every transformation step and provider normalizer, plus an end-to-end integration test exercising the full pipeline:

```bash
# Run all unit and integration tests
npm test

# Run tests with coverage report
npm run test:cov
```

### Test Coverage Highlights:
- `validation.step.spec.ts`: Tests clean inputs and ugly edge cases (31% 404 scraper errors, pagination errors, non-200 status codes).
- `mapping.step.spec.ts`: Tests declarative field extraction and mapping.
- `normalization.step.spec.ts`: Tests string trimming, lat/lon coordinate parsing, URL parameter extraction, delivery range parsing, phone cleaning.
- `deduplication.step.spec.ts`: Tests intra-batch natural key collision resolution.
- `projection.step.spec.ts`: Tests conversion to domain models.
- `talabat.adapter.spec.ts`: Tests multi-collection processing and nested menu item extraction.
- `pipeline.integration.spec.ts`: Full end-to-end integration test verifying transformation, quarantine, and idempotency.

---

## 🔭 Known Gaps & Next Steps

### Honest Assessment of Current Scope:
- **Streaming Cursor Size**: Cursors stream in batches of 50–100 documents. For millions of documents, cursor timeouts on stale connections should be guarded with `noCursorTimeout` or range-based pagination on `_id`.
- **Menu Categorization Hierarchy**: Currently, menu items capture `categoryId` and `categoryName`. Nested modifier groups (e.g. choice of sauce, beverage sizes) could be normalized into a dedicated `item_modifiers` schema.
- **Provider API Webhook Notifications**: Future iteration would include webhook callbacks when runs complete.

### What I Would Do With Another Week:
1. **OpenSearch / Elasticsearch River**: Stream projected `restaurants` and `menu_items` to Elasticsearch for typo-tolerant fuzzy search and autocomplete.
2. **Prometheus / Grafana Observability**: Expose `/metrics` with OpenTelemetry tracing and Prometheus metrics for BullMQ queue latency, job processing time histograms, and stage throughput.
3. **Automated Schema Drift Detection**: An alerting hook that analyzes quarantined documents and triggers Slack/PagerDuty notifications when new unknown fields or error formats appear in third-party provider payloads.
4. **Change Data Capture (CDC)**: Integrate MongoDB Change Streams on `provider_raw` to automatically trigger differential runs when new raw exports land in staging.
