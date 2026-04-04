# CLAUDE.md

## Project overview

FreezerApp ("Морозилка") — household freezer inventory manager. Monorepo with three components:

| Component | Path | Stack |
|-----------|------|-------|
| iOS app | `FreezerApp/` | SwiftUI, iOS 18.1+, Xcode 26 |
| Web app | `src/` | React 18, TypeScript, Vite, Tailwind |
| Backend | `backend/` | Fastify, TypeScript, PostgreSQL, JWT |

Monitoring stack in `monitoring/` (Grafana + Prometheus + Loki).

## Quick start

```bash
# Web
npm install && npm run dev          # http://localhost:3000

# Backend
cd backend && npm install && npm run dev

# iOS
open FreezerApp/FreezerApp.xcodeproj    # Cmd+R in Xcode
```

## iOS app (`FreezerApp/`)

- **Entry point:** `App/FreezerApp.swift` — auth gate, language, environment objects
- **Architecture:** MVVM-ish with `DataRepository` as central state
- **Auth:** email/password via `APIClient` → JWT stored in Keychain
- **Sync:** pair-based via `SyncService` (5s periodic timer when paired)
- **Storage:** `NSUbiquitousKeyValueStore` + `UserDefaults` fallback
- **No CocoaPods** — all dependencies removed, build with `.xcodeproj` directly
- **Localization:** ru/en via `Localization.swift` + `.lproj` bundles, runtime switching via `@AppStorage("appLanguage")`
- **Build:** `xcodebuild build -project FreezerApp/FreezerApp.xcodeproj -scheme FreezerApp -destination 'generic/platform=iOS'`

### Key files
- `Core/Repository/DataRepository.swift` — CRUD, soft deletes, sync queue
- `Core/Services/SyncService.swift` — pair create/join/leave, periodic sync
- `Core/Services/APIClient.swift` — base URL: `https://api.freezer.moone.dev`
- `Core/Services/KeychainService.swift` — tokens, pair/user IDs
- `Core/NotificationService.swift` — expiration alerts
- `Core/BackupService.swift` — JSON export/import
- `Core/FeatureFlags.swift` — feature toggles (iCloud sync currently off)

### Storage keys
`freezer-categories`, `freezer-items`, `freezer-history`, `notificationsEnabled`, `notificationDaysData`, `appearanceMode`, `appLanguage`

## Backend (`backend/`)

- **Routes:** `/pair/create`, `/pair/join`, `/pair/leave`, `/sync`, `/sync/status`, `/analytics`
- **Auth:** JWT (register/login/logout + `/me` endpoint)
- **Sync model:** pair-level monotonic `server_version`, last-write-wins conflicts, soft deletes
- **Migrations:** `backend/migrations/` (tracked in `_migrations` table)
- **Deploy:** Dokploy (Docker Swarm) on `77.90.43.8`, auto-deploy from `main`
- **Production URL:** `https://api.freezer.moone.dev`
- **Env:** see `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `HOST`, `CORS_ORIGIN`, `TRUST_PROXY`)

## Web app (`src/`)

- **Entry:** `src/App.tsx` — screen routing, localStorage persistence
- **Storage:** `freezer-categories`, `freezer-items` in localStorage
- **Dev port:** 5174 (configured in `vite.config.ts`)
- **Build output:** `build/` directory
- **Deploy:** Dokploy (Nixpacks) on `77.90.43.8`, auto-deploy from `main`
- **Production URL:** `https://freezer.moone.dev`
- **Build-time env:** `VITE_API_BASE_URL=https://api.freezer.moone.dev`

## Deployment

- **Server:** `77.90.43.8` (Dokploy, Docker Swarm)
- **Project:** `frozen-app` in Dokploy
- **Database:** PostgreSQL 15-alpine (internal service `freezer-db`)
- **DNS:** CloudFlare (DNS-only, no proxy) — required for Let's Encrypt HTTP challenge
- **TLS:** Let's Encrypt via Traefik
- **Auto-deploy:** both apps redeploy on push to `main`

## Conventions

- Primary language: Russian (UI strings, comments sometimes)
- Commit style: lowercase, descriptive (`feat:`, `fix:`, or plain description)
- iOS min deployment: 18.1
- No automated tests currently
- `docs/prd.md` has full product requirements and roadmap
