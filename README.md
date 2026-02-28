# FreezerApp — Household Freezer Inventory Manager

Cross-platform app for tracking frozen food inventory with partner sync.

## Platforms

| Platform | Status | Stack | Path |
|----------|--------|-------|------|
| iOS | Active | SwiftUI, iOS 18.1+ | `FreezerApp/` |
| Web | Active | React 18 + TypeScript + Vite | `src/` |
| Backend | Active | Fastify + PostgreSQL | `backend/` |
| Monitoring | Active | Grafana + Prometheus + Loki | `monitoring/` |

## Quick start

### Web

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # output: build/
```

Requires Node.js 18+.

### iOS

Open `FreezerApp/FreezerApp.xcodeproj` in Xcode 26+ and run (Cmd+R).
Notifications and sync require a real device with an Apple account.

### Backend

```bash
cd backend
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET
npm install
npm run migrate
npm run dev
```

## Features

### Categories
- Create / edit / delete with custom icons and colors
- Drag & drop reorder
- Auto item count

### Items
- Full metadata: name, packages, count, shelf, freeze date, expiration date, notes
- Quick quantity adjustment (+/- buttons)
- Expiration status indicators (fresh / expiring soon / expired)
- Search by name and notes, filter by shelf
- Swipe actions for edit/delete (iOS)

### Sync & Sharing
- Email/password authentication
- Partner pairing via invite codes
- Real-time cloud sync (5-second interval)
- Offline-first with background synchronization
- Conflict resolution (last-write-wins)

### Other
- Push notifications before expiration (configurable: 3, 7, 14 days)
- JSON export/import with validation
- History log (item creation, quantity changes)
- Light/dark/system theme
- Localization: Russian (primary), English

## Architecture

### iOS (`FreezerApp/`)
```
App/            Entry point, auth gate
Core/
  Models/       Category, Item, HistoryEvent, Pair, SyncStatus
  Repository/   DataRepository (central state, CRUD, sync queue)
  Services/     APIClient, SyncService, KeychainService
  ...           NotificationService, BackupService, AnalyticsService, Localization
Features/
  Categories/   Category list and form views
  Items/        Item list and form views
  Settings/     Settings, pair create/join views
UI/
  Components/   CategoryCard, ItemRow
  Theme/        Colors, typography, spacing
```

### Web (`src/`)
```
App.tsx              Main component, state, routing
components/          CategoryList, ItemList, ItemForm, ItemRow, etc.
components/ui/       Radix UI primitives
styles/globals.css   Tailwind theme tokens
```

### Backend (`backend/`)
```
src/
  index.ts           Boot, DB connection, route registration
  server.ts          Fastify setup, CORS, JWT, rate limiting
  routes/            pair.ts, sync.ts, analytics.ts, auth.ts
  services/          conflict-resolver.ts
  utils/             key-transform.ts
migrations/          SQL migrations (tracked in _migrations table)
```

## Design

- [Figma](https://www.figma.com/design/ldv0VwJxMG8DfRvIIskA9z/Frozen-Food-Inventory-App)
- iOS Human Interface Guidelines inspired
- Mobile-first, clean UI

## License

MIT License
