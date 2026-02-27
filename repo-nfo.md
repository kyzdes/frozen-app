# Repo Info (`repo-nfo.md`)

Purpose: quick working map of this repository for future coding tasks.
Last updated: 2026-02-27

## 1) Repository at a glance

This is a multi-app repository for **FreezerApp ("Морозилка")** with:
- a web app (React/Vite) at repo root (`src/`),
- an iOS app (SwiftUI) in `FreezerApp/`,
- a sync backend (Fastify/Postgres) in `backend/`,
- an ops/monitoring stack in `monitoring/`.

Primary product direction appears to be iOS-first (see `prd.md`, version `0.7.6`, updated `2026-02-16`).

## 2) Top-level folders and what they are

- `src/`: web UI code (single-page state machine, localStorage persistence).
- `backend/`: TypeScript API server for pair-based sync + analytics + metrics.
- `FreezerApp/`: Xcode/SwiftUI app with local repo, sync service, notifications, backup/import.
- `monitoring/`: Grafana + Prometheus + Loki + Promtail + cAdvisor + Node Exporter.
- `prd.md`: product requirements and roadmap (most strategic context).
- `README.md`: high-level readme, partially outdated (still references `/ios-app`).
- `backend-context-codex.md`, `codex-context-reminder.md`: internal context notes.

## 3) Web app (`src/`)

### Stack
- React 18 + TypeScript + Vite (`@vitejs/plugin-react-swc`)
- Tailwind-generated CSS (`src/index.css`) + theme tokens in `src/styles/globals.css`
- Icons: `lucide-react`

### Entry points and key files
- `src/main.tsx`: mounts app.
- `src/App.tsx`: central state and screen routing (`home | category | item-form`).
- `src/components/CategoryList.tsx`
- `src/components/CategoryModal.tsx`
- `src/components/ItemList.tsx`
- `src/components/ItemForm.tsx`
- `src/components/ItemRow.tsx`

### Data model and storage
- Persists to localStorage keys:
  - `freezer-categories`
  - `freezer-items`
- Seeds sample categories if empty.
- Tracks categories and items in memory; category item counts are derived from item list.

### Behavior notes
- Mobile-first iOS-like layout.
- Category drag-and-drop reorder is implemented.
- Item row supports quantity +/- and swipe-to-reveal actions on touch.
- Item form supports optional photo as base64 data URL in localStorage.

### Web commands
- `npm install`
- `npm run dev` (Vite dev server)
- `npm run build`

### Important mismatch
- Root `README.md` says default Vite URL is `localhost:5173`, but `vite.config.ts` sets dev port to `3000`.

## 4) Backend (`backend/`)

### Stack
- Node.js + TypeScript
- Fastify + JWT + CORS + rate limit
- PostgreSQL (`pg`)
- Prometheus metrics via `prom-client`

### Entry points
- `backend/src/index.ts`: boots DB connection, registers routes, starts server.
- `backend/src/server.ts`: Fastify setup, CORS/JWT/rate-limit, health + `/metrics`, error handlers.

### Routes
- `backend/src/routes/pair.ts`
  - `POST /pair/create`
  - `POST /pair/join`
  - `POST /pair/leave`
- `backend/src/routes/sync.ts`
  - `POST /sync`
  - `GET /sync/status`
- `backend/src/routes/analytics.ts`
  - `POST /analytics` (allowed event whitelist)

### Sync model
- Pair-level monotonic `server_version`.
- Client sends `last_known_version` + batched `changes`.
- Server applies writes, increments version, returns `server_changes` where `server_version > last_known_version`.
- Conflict resolution: last-write-wins using timestamps (`resolveConflict` in `services/conflict-resolver.ts`).
- Soft delete supported via `deleted_at`.
- API accepts both `snake_case` and `camelCase` in critical fields; conversion helpers:
  - `backend/src/utils/key-transform.ts`

### DB and migrations
- Schema: `backend/migrations/001_initial.sql`
- Patch migration: `backend/migrations/002_fix_schema.sql`
- Runner: `backend/migrations/run.js` (tracks applied files in `_migrations` table).

### Environment/config
- Example env: `backend/.env.example`
- Core env vars:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT`
  - `HOST`
  - `LOG_LEVEL`
  - optional `CORS_ORIGIN`

### Runtime/deploy files
- `backend/docker-compose.yml`
- `backend/docker-compose.local.yml`
- `backend/Dockerfile`
- `backend/startup.sh` (runs migrations then starts server)
- `backend/nginx.conf`

### Backend commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run migrate`

## 5) iOS app (`FreezerApp/`)

### Stack
- SwiftUI
- local persistence via `NSUbiquitousKeyValueStore` + `UserDefaults` fallback
- Keychain for device/token/pair/user IDs
- optional backend sync (pair-based)
- local notification scheduling
- Adapty SDK activated at app startup

### App entry and architecture
- `FreezerApp/App/FreezerApp.swift`
  - initializes `SyncService.shared`
  - initializes `DataRepository(syncService: .shared)`
  - sets language via `@AppStorage("appLanguage")`
- `DataRepository` is central domain state for:
  - `categories`
  - `items`
  - `history`

### Core services
- `Core/Repository/DataRepository.swift`
  - CRUD for categories/items
  - soft delete semantics for sync
  - history creation and retention limit (500)
  - queues sync changes through `SyncService`
- `Core/Services/SyncService.swift`
  - create/join/leave pair
  - 5-second periodic sync timer when paired
  - pending-change aggregation before API sync
- `Core/Services/APIClient.swift`
  - base URL currently hardcoded: `https://apps.moone.dev`
- `Core/Services/KeychainService.swift`
- `Core/NotificationService.swift`
- `Core/BackupService.swift` (JSON export/import and validation)
- `Core/AnalyticsService.swift`

### Feature folders
- `Features/Categories/Views`
- `Features/Items/Views`
- `Features/Settings`

### UI theme
- `UI/Theme/Theme.swift` centralizes colors, typography, spacing, preset icons/colors.

### iOS behavior notes
- Main list has expandable categories and embedded item previews.
- History UI is defined inside `CategoryListView.swift` as a private nested `HistoryView`.
- Feature flag `FeatureFlags.is_icloud_sync_active` is currently `false`.

## 6) Monitoring (`monitoring/`)

Contains a complete containerized observability setup:
- Grafana
- Prometheus
- Loki
- Promtail
- cAdvisor
- Node Exporter

Key files:
- `monitoring/docker-compose.yml`
- `monitoring/prometheus/prometheus.yml`
- `monitoring/loki/loki-config.yml`
- `monitoring/promtail/promtail-config.yml`
- `monitoring/grafana/provisioning/...`
- `monitoring/nginx-monitor.conf`
- `monitoring/deploy-monitoring.sh`

## 7) Notable mismatches and gotchas

- Root README references `/ios-app`; actual iOS app path is `FreezerApp/`.
- Web and iOS feature sets differ (iOS is richer: history, backup/import, pair sync settings).
- `src/components/ui/*` contains many generic UI primitives that appear mostly unused by the active web app.
- No dedicated automated tests were found for app/backend code.
- Sync contracts rely on key-case conversions and timestamp correctness; these are easy break points.
- Repository includes generated/vendor-heavy directories (e.g., `FreezerApp/Pods`, `backend/dist`, `backend/node_modules`) in current working tree context.

## 8) Sensitive or environment-specific data to treat carefully

- `FreezerApp/App/FreezerApp.swift` contains an Adapty public key.
- `monitoring/ACCESS_INFO.md` includes concrete infra host and Grafana credentials.
- monitoring and API configs include real domains (`monitor.moone.dev`, `apps.moone.dev`).

## 9) Practical "start here" order for future tasks

1. Read `prd.md` for product intent and current version context.
2. If iOS task: open `FreezerApp/App/FreezerApp.swift`, then `DataRepository.swift`, then relevant `Features/*/Views`.
3. If backend task: open `backend/src/server.ts`, route file, then migration SQL.
4. If web task: open `src/App.tsx` + affected component.
5. Validate docs against code before implementing; several docs are stale.

## 10) Quick sanity checks

- Web run: `npm run dev` (root).
- Backend run: `cd backend && npm run dev`.
- Backend health: `GET /health`.
- Backend metrics: `GET /metrics`.
- iOS run: open Xcode project and run on simulator/device.

