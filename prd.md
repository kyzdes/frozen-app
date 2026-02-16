# Product Requirements Document (PRD)

## FreezerApp — Household Freezer Inventory Manager

| Field | Value |
|---|---|
| **Product Name** | FreezerApp (Морозилка) |
| **Version** | 0.7.6 |
| **Platform** | iOS (native, SwiftUI) |
| **Min iOS Version** | 18.1 |
| **Status** | Late-stage development, pre-launch |
| **Author** | Viacheslav Kuznetsov |
| **Contact** | ceo@moone.dev |
| **Last Updated** | 2026-02-16 |
| **Design** | [Figma](https://www.figma.com/design/ldv0VwJxMG8DfRvIIskA9z/Frozen-Food-Inventory-App) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Product Vision & Goals](#4-product-vision--goals)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Feature Specification](#6-feature-specification)
7. [Information Architecture](#7-information-architecture)
8. [Data Model](#8-data-model)
9. [Backend & Sync Architecture](#9-backend--sync-architecture)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Analytics & Metrics](#11-analytics--metrics)
12. [Monetization Strategy](#12-monetization-strategy)
13. [Localization](#13-localization)
14. [Current State & Roadmap](#14-current-state--roadmap)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

FreezerApp is a native iOS application that helps households organize and track frozen food inventory. Users can create categories, add items with expiration dates, receive notifications before food expires, and share the inventory with a partner via real-time cloud sync.

The app is designed for the Russian-speaking market (primary) with English localization. It follows iOS Human Interface Guidelines with a minimalist, clean UI.

**Key differentiators:**
- Partner sync via invite code (no account registration required)
- Expiration tracking with push notifications
- Full offline capability with background cloud synchronization
- Export/import for data portability

---

## 2. Problem Statement

### The Problem

Households that maintain a freezer face a common set of issues:

1. **No visibility** — people forget what they froze, when they froze it, and where exactly it is in the freezer.
2. **Food waste** — items expire unnoticed because there is no tracking or reminder system.
3. **Coordination failure** — when two people share a freezer (couples, roommates), neither knows what the other has taken out or added without verbal communication.
4. **No quick lookup** — finding a specific item means physically digging through the freezer.

### Why Existing Solutions Fall Short

| Solution | Problem |
|---|---|
| Paper lists / whiteboards | Easily forgotten, not portable, no expiration alerts |
| Generic note apps | No structure, no expiration logic, no shared state |
| Spreadsheets | High friction, bad UX on mobile, no notifications |
| Existing freezer apps | Poor UX, no partner sync, abandoned/outdated |

### Opportunity

A purpose-built mobile app with structured data, smart notifications, and effortless partner sharing can solve all four problems with minimal user effort.

---

## 3. Target Audience

### Primary Persona: Household Food Manager

| Attribute | Description |
|---|---|
| **Demographics** | Adults 25–50, managing a household |
| **Geography** | Russia, CIS countries (primary); English-speaking markets (secondary) |
| **Behavior** | Regularly buys food in bulk, freezes homemade meals and produce |
| **Pain point** | Losing track of frozen items, food spoiling unnoticed |
| **Tech literacy** | Comfortable with iOS apps, uses iPhone daily |

### Secondary Persona: Partner / Household Member

- Joins an existing shared freezer via invite code
- Primarily views inventory, occasionally adds/removes items
- Needs a zero-friction onboarding (no registration)

### Tertiary Persona: Meal Preppers / Organized Households

- Uses the app to catalog frozen meal preps with dates
- Values shelf organization and expiration visibility
- May use export/import for backup or season-based archiving

---

## 4. Product Vision & Goals

### Vision

Become the default tool households use to manage frozen food — simple enough to adopt in 30 seconds, powerful enough to reduce food waste measurably.

### Product Goals

| # | Goal | Success Metric |
|---|---|---|
| G1 | Reduce food waste for users | < 5% of tracked items expire without user action |
| G2 | Frictionless partner sharing | > 40% of active users connect a partner |
| G3 | Daily or near-daily engagement | DAU/MAU > 30% |
| G4 | High retention | D30 retention > 25% |
| G5 | App Store rating | >= 4.5 stars |

### Design Principles

1. **Speed over perfection** — adding an item should take < 10 seconds
2. **Glanceable** — the main screen must communicate inventory state at a glance
3. **Zero-config sharing** — invite code, not email/password registration
4. **Offline-first** — everything works without internet; sync happens silently

---

## 5. User Stories & Use Cases

### Epic 1: Inventory Management

| ID | Story | Priority |
|---|---|---|
| US-1.1 | As a user, I want to create categories (e.g., "Vegetables", "Meat") so I can organize my freezer logically. | P0 |
| US-1.2 | As a user, I want to pick an emoji icon and color for each category so I can visually distinguish them. | P1 |
| US-1.3 | As a user, I want to reorder categories by dragging so my most-used categories appear first. | P1 |
| US-1.4 | As a user, I want to add items with name, quantity (packages + pieces), shelf number, freeze date, expiration date, and optional notes. | P0 |
| US-1.5 | As a user, I want to quickly increment/decrement item quantities with +/- buttons. | P0 |
| US-1.6 | As a user, I want to see a visual indicator (green/yellow/red) showing whether an item is fresh, expiring soon, or expired. | P0 |
| US-1.7 | As a user, I want to search items by name and notes so I can quickly find what I need. | P1 |
| US-1.8 | As a user, I want to filter items by shelf number so I know exactly where to look. | P1 |
| US-1.9 | As a user, I want to expand/collapse categories on the main screen for a quick overview. | P1 |

### Epic 2: Expiration Notifications

| ID | Story | Priority |
|---|---|---|
| US-2.1 | As a user, I want to receive push notifications N days before an item expires so I can use it in time. | P0 |
| US-2.2 | As a user, I want to configure the notification lead time (3, 7, or 14 days). | P1 |
| US-2.3 | As a user, I want to toggle notifications on/off globally. | P1 |

### Epic 3: Partner Sync

| ID | Story | Priority |
|---|---|---|
| US-3.1 | As a user, I want to create a shared freezer and get an invite code so my partner can join. | P0 |
| US-3.2 | As a user, I want to join an existing shared freezer by entering a 6-digit code. | P0 |
| US-3.3 | As a user, I want changes made by my partner to appear automatically on my device. | P0 |
| US-3.4 | As a user, I want to see sync status (syncing, synced, offline, error). | P1 |
| US-3.5 | As a user, I want to leave a shared freezer and revert to local-only mode. | P1 |

### Epic 4: Data Management

| ID | Story | Priority |
|---|---|---|
| US-4.1 | As a user, I want to export my data as a JSON file for backup. | P1 |
| US-4.2 | As a user, I want to import data from a backup file. | P1 |
| US-4.3 | As a user, I want to see a history of all changes (added, edited, quantity changed, deleted). | P2 |
| US-4.4 | As a user, I want to sort and filter history by date. | P2 |

### Epic 5: Personalization

| ID | Story | Priority |
|---|---|---|
| US-5.1 | As a user, I want to switch between Russian and English at runtime. | P1 |
| US-5.2 | As a user, I want to choose system/light/dark appearance mode. | P1 |

---

## 6. Feature Specification

### 6.1 Category Management

**Description:** Users organize their freezer contents into named categories with visual identifiers.

| Feature | Details |
|---|---|
| Create category | Name (required), emoji icon (30+ presets, optional), color (8 presets, optional) |
| Edit category | All fields editable in-place |
| Delete category | Confirmation alert; cascading soft delete of contained items |
| Reorder | Swipe-based reorder on main screen; persists via `sortOrder` |
| Item count badge | Displays live count of active (non-deleted) items |
| Expand/collapse | Disclosure group on main screen shows top items; "Open Full List" navigates to detail |
| Expand/collapse all | Toolbar button toggles all categories |

**Preset Icons:** 🥬 🍖 🫐 🥣 🐟 🥟 🥩 🍗 🥕 🍅 🌽 🥦 🍄 🧀 🥚 🍞 🥧 🍰 🍦 🥤 🫙 🍯 ☕️ 🧊 🧈 🫘 🥜 🌿 🍋 🍊 (and more)

**Preset Colors:** `#FF6B6B`, `#4ECDC4`, `#45B7D1`, `#96CEB4`, `#FFEAA7`, `#DDA0DD`, `#98D8C8`, `#F7DC6F`

---

### 6.2 Item Management

**Description:** Individual food items stored within categories, with full metadata.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | String | Yes | — | Free text, searchable |
| `packagesCount` | Int | Yes | 1 | Number of packages/containers |
| `itemsCount` | Int | Yes | 1 | Number of individual items |
| `shelfNumber` | Int | Yes | 1 | Freezer shelf location |
| `freezeDate` | Date | Yes | Today | When the item was frozen |
| `expirationDate` | Date | Yes | — | When the item expires |
| `notes` | String | No | nil | Additional notes, searchable |
| `photoUrl` | String | No | nil | Future: photo attachment |
| `categoryId` | String | Yes | — | FK to parent category |

**Expiration Status Logic:**
- **Fresh** (green): `daysUntilExpiration > 30`
- **Expiring Soon** (yellow): `0 <= daysUntilExpiration <= 30`
- **Expired** (red): `daysUntilExpiration < 0`

**Quick Actions:**
- `+`/`-` buttons on each item row for adjusting `packagesCount` and `itemsCount`
- Swipe left to delete (with confirmation)
- Swipe right to edit (opens form)

---

### 6.3 Expiration Notifications

**Description:** Local push notifications alerting users before items expire.

| Aspect | Details |
|---|---|
| Trigger | Scheduled based on `expirationDate - notificationDays` |
| Configurable lead times | 3 days, 7 days, 14 days (multi-select) |
| Permission flow | Standard iOS notification permission request |
| Badge count | Number of expiring/expired items |
| Rescheduling | On every item add/edit/delete and on app launch |
| Global toggle | On/off in Settings |

---

### 6.4 Partner Sync (Shared Freezer)

**Description:** Two users share a single freezer inventory in real-time without account registration.

**Flow — Creating a Shared Freezer:**
1. User taps "Create shared freezer" in Settings
2. Enters a name for the freezer
3. System generates a unique `device_id`, creates a pair on the backend
4. Returns: `pair_id`, `user_id`, JWT `token`, 6-digit `invite_code` (valid 24h)
5. User shares the code with their partner

**Flow — Joining a Shared Freezer:**
1. Partner taps "Join shared freezer" in Settings
2. Enters the 6-digit code
3. System validates the code, creates a user, joins the pair
4. Returns: JWT token + full initial dataset
5. Partner's device replaces local data with shared data

**Sync Mechanism:**
- Polling interval: every 5 seconds while app is active
- Protocol: REST POST `/sync` with delta payloads
- Conflict resolution: Last-write-wins by `updatedAt` timestamp
- Version tracking: monotonically increasing `server_version` on the pair
- Offline handling: changes queued locally; synced on reconnection
- Soft deletes: `deletedAt` field; newer soft-delete always wins

**Sync Status States:**
- `idle` — no sync in progress
- `syncing` — sync request in-flight
- `success` — last sync completed successfully
- `offline` — no network connectivity
- `error(message)` — sync failed with error
- `pendingChanges(count)` — local changes waiting to sync

---

### 6.5 Backup & Restore

**Description:** Export all data to a JSON file and import from a backup.

**Export:**
- Includes: categories, items, history events, metadata (export date, app version, item/category counts)
- Format: JSON file via iOS share sheet
- Available in Settings

**Import:**
- File picker for `.json` files
- Validation: schema check, duplicate ID detection, orphaned item detection
- Full data replacement (after confirmation)

---

### 6.6 History / Activity Log

**Description:** Chronological log of all inventory changes for audit and review.

**Event Types:**
| Event | Payload |
|---|---|
| `itemAdded` | Item name, category |
| `itemUpdated` | Item name, changed fields |
| `itemDeleted` | Item name, category |
| `packagesChanged` | Item name, delta (+/-), new count |
| `itemsChanged` | Item name, delta (+/-), new count |

**Features:**
- Sort: newest first / oldest first
- Filter: by date range
- Max stored events: 500
- Included in export/import

---

### 6.7 Settings

| Section | Options |
|---|---|
| **Backup** | Export data, Import data |
| **Appearance** | Language (Russian/English), Theme (System/Light/Dark) |
| **Notifications** | Toggle on/off, Reminder days (3/7/14) |
| **Sync** | Create pair, Join pair, Sync status, Manual sync, Leave pair |
| **Statistics** | Category count, Item count |
| **About** | App version, Contact support (ceo@moone.dev) |
| **Developer Tools** | Hidden (tap version 5x): Clear sync, Debug info, Demo data (DEBUG) |

---

## 7. Information Architecture

### Screen Map

```
CategoryListView (Root / Main Screen)
│
├── [Bottom Toolbar]
│   ├── History → HistoryView (push)
│   ├── Settings → SettingsView (sheet)
│   ├── Search bar (inline)
│   └── Add Category (+) → CategoryFormView (sheet)
│
├── [Category Disclosure Groups]
│   ├── ItemRow (compact, no swipe)
│   └── "Open Full List" → ItemListView (push)
│       ├── Search bar
│       ├── Shelf filter picker
│       ├── ItemRow (full, with swipe actions)
│       │   ├── Swipe Edit → ItemFormView (sheet)
│       │   └── Swipe Delete → Confirmation alert
│       └── Add Item (+) → ItemFormView (sheet)
│
├── CategoryFormView (sheet, Add/Edit)
│   └── Delete category alert
│
└── SettingsView (sheet)
    ├── CreatePairView (sheet)
    └── JoinPairView (sheet)
```

### Navigation Pattern

- **Root:** `NavigationStack` (iOS 16+)
- **Primary navigation:** Push (NavigationLink) for drill-down (categories → items, history)
- **Secondary navigation:** Sheets for creation/editing forms and settings
- **Back navigation:** Standard iOS back button in navigation bar

---

## 8. Data Model

### 8.1 Entity Diagram

```
┌────────────────┐       ┌────────────────────┐
│   Category     │       │      Item          │
│────────────────│       │────────────────────│
│ id: String (PK)│◄──────│ categoryId: String │
│ name: String   │  1:N  │ id: String (PK)    │
│ icon: String?  │       │ name: String       │
│ color: String? │       │ packagesCount: Int  │
│ itemCount: Int │       │ itemsCount: Int     │
│ sortOrder: Int?│       │ shelfNumber: Int    │
│ updatedAt: Date│       │ freezeDate: Date    │
│ deletedAt:Date?│       │ expirationDate:Date │
└────────────────┘       │ notes: String?      │
                         │ photoUrl: String?   │
                         │ updatedAt: Date     │
                         │ deletedAt: Date?    │
                         └────────────────────┘

┌────────────────────┐       ┌────────────────┐
│   HistoryEvent     │       │     Pair       │
│────────────────────│       │────────────────│
│ id: String (PK)    │       │ id: String (PK)│
│ type: EventType    │       │ name: String   │
│ itemId: String?    │       │ serverVersion  │
│ categoryId: String?│       │ createdAt: Date│
│ itemName: String   │       │ updatedAt: Date│
│ packagesDelta: Int?│       └────────────────┘
│ itemsDelta: Int?   │
│ timestamp: Date    │
│ updatedAt: Date    │
│ deletedAt: Date?   │
└────────────────────┘
```

### 8.2 Persistence Strategy

| Layer | Technology | Purpose |
|---|---|---|
| **Primary local** | `UserDefaults` | Categories, items, history (JSON-encoded via `Codable`) |
| **iCloud KVS** | `NSUbiquitousKeyValueStore` | Cross-device local sync (currently disabled via feature flag) |
| **Secure storage** | `Keychain` | Device ID, JWT token, pair ID, user ID |
| **Preferences** | `@AppStorage` | Language, theme, notification settings |
| **Backend** | PostgreSQL (via REST API) | Partner sync data (see Section 9) |

### 8.3 UserDefaults Keys

| Key | Type | Content |
|---|---|---|
| `freezer-categories` | Data | JSON-encoded `[Category]` |
| `freezer-items` | Data | JSON-encoded `[Item]` |
| `freezer-history` | Data | JSON-encoded `[HistoryEvent]` |
| `notificationDays` | [Int] | Notification lead time days |
| `appLanguage` | String | `"ru"` or `"en"` |
| `appearanceMode` | String | `"Системная"`, `"Светлая"`, `"Темная"` |

### 8.4 Keychain Keys

| Key | Content |
|---|---|
| `com.freezerapp.deviceId` | UUID, generated once per device |
| `com.freezerapp.authToken` | JWT token from backend |
| `com.freezerapp.pairId` | Active pair UUID |
| `com.freezerapp.userId` | User UUID in current pair |

---

## 9. Backend & Sync Architecture

### 9.1 Infrastructure

| Component | Technology | Details |
|---|---|---|
| API Server | Fastify (Node.js) | Single process, REST/JSON |
| Database | PostgreSQL | Version-based delta sync |
| Reverse Proxy | Nginx | TLS termination, rate limiting |
| Hosting | VPS 1 vCPU / 1 GB RAM | `apps.moone.dev` |
| Auth | JWT (`@fastify/jwt`) | Stateless, embedded pair_id + user_id |
| Monitoring | Prometheus (`prom-client`) | Request rate, latency, sync ops |
| Logging | Pino | Structured JSON logs |

### 9.2 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/pair/create` | No | Create pair → returns JWT + invite code |
| `POST` | `/pair/join` | No | Join pair via invite code → returns JWT + initial data |
| `POST` | `/pair/leave` | Bearer | Leave current pair |
| `POST` | `/sync` | Bearer | Send pending changes, receive server changes |
| `POST` | `/analytics` | No | Fire-and-forget analytics events |

### 9.3 Sync Protocol

```
Client                              Server
  │                                    │
  │  POST /sync                        │
  │  { last_known_version: 42,         │
  │    changes: {                      │
  │      categories: [...],            │
  │      items: [...],                 │
  │      history: [...]  }}            │
  │ ──────────────────────────────────►│
  │                                    │ Apply changes (increment server_version per change)
  │                                    │ Resolve conflicts (last-write-wins by updatedAt)
  │  { server_version: 47,            │
  │    applied_changes: [...],         │
  │    server_changes: {               │
  │      categories: [...],            │◄── Changes since client's version
  │      items: [...],                 │
  │      history: [...] }}             │
  │ ◄──────────────────────────────────│
  │                                    │
  │  Merge server_changes locally      │
  │  Update last_known_version = 47    │
```

### 9.4 Database Schema

```sql
users       (id UUID PK, email TEXT NULL, created_at TIMESTAMPTZ)
pairs       (id UUID PK, name TEXT, server_version BIGINT DEFAULT 0, created_at TIMESTAMPTZ)
pair_members(pair_id FK, user_id FK, role TEXT, joined_at TIMESTAMPTZ)
invites     (code TEXT UNIQUE, pair_id FK, expires_at TIMESTAMPTZ, used BOOL)
categories  (id UUID PK, pair_id FK, name, icon, color, sort_order, updated_at, deleted_at, server_version)
items       (id UUID PK, pair_id FK, category_id FK, name, packages, items, shelf,
             freeze_date, expiration_date, notes, photo_url, updated_at, deleted_at, server_version)
history     (id UUID PK, pair_id FK, item_id UUID NULL, event_type, payload JSONB,
             created_at, server_version)
```

**Indexes:** `(pair_id, server_version)` on categories, items, history; `(category_id)` on items; `(code)` on invites.

### 9.5 Conflict Resolution Rules

| Scenario | Resolution |
|---|---|
| Same entity modified by both users | Record with more recent `updatedAt` wins |
| One user modifies, other deletes | If `deletedAt` is more recent, deletion wins |
| Both users create same-ID entity | Impossible (UUID collision) |
| Client offline for extended period | All queued changes sent on reconnect; server applies sequentially |

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target |
|---|---|
| App cold launch | < 1.5 seconds |
| Add item form submit | < 200ms (local persistence) |
| Sync round-trip | < 500ms on 4G |
| Max categories | 100+ without degradation |
| Max items per category | 500+ without degradation |
| Sync polling interval | 5 seconds |

### 10.2 Reliability

| Requirement | Details |
|---|---|
| Offline operation | 100% feature availability without network |
| Data durability | UserDefaults + optional export; no data loss on crash |
| Sync resilience | Queued changes survive app restart; retry on next cycle |
| Backend uptime | 99%+ (single VPS with Nginx) |

### 10.3 Security

| Requirement | Implementation |
|---|---|
| Token storage | iOS Keychain (hardware-backed on modern devices) |
| API authentication | JWT with pair_id + user_id claims |
| Transport | HTTPS only (TLS via Nginx + certbot) |
| Rate limiting | `@fastify/rate-limit` on all endpoints |
| Invite codes | 6-digit, 24-hour expiry, single-use |
| No PII collected | No email, no name, no phone required |

### 10.4 Accessibility

| Requirement | Status |
|---|---|
| VoiceOver support | SwiftUI default labels (needs audit) |
| Dynamic Type | SwiftUI default scaling |
| Color contrast | System colors + expiration indicators need audit |
| Dark mode | Full support (System/Light/Dark) |

### 10.5 Compatibility

| Requirement | Value |
|---|---|
| Minimum iOS | 18.1 |
| Xcode | 16+ |
| Device support | iPhone (all sizes), iPad (adaptive layout) |

---

## 11. Analytics & Metrics

### 11.1 Tracked Events

| Category | Events |
|---|---|
| **Lifecycle** | `app_opened` |
| **Categories** | `category_created`, `category_edited`, `category_deleted`, `categories_reordered`, `category_expanded`, `category_collapsed`, `all_categories_expanded`, `all_categories_collapsed` |
| **Items** | `item_created`, `item_edited`, `item_deleted`, `item_packages_updated`, `item_items_updated` |
| **Search** | `search_performed`, `shelf_filter_applied`, `filter_cleared` |
| **Notifications** | `notifications_enabled` |
| **Pairing** | `pair_created`, `pair_joined` |

### 11.2 Event Payload Structure

```json
{
  "event": "item_created",
  "device_id": "uuid",
  "user_id": "uuid (optional)",
  "pair_id": "uuid (optional)",
  "timestamp": "ISO-8601",
  "properties": {
    "name": "Chicken broth",
    "category_id": "uuid",
    "shelf_number": "3"
  }
}
```

### 11.3 Key Product Metrics (KPIs)

| Metric | Definition | Target |
|---|---|---|
| **DAU** | Unique devices opening the app per day | Track growth |
| **Items per user** | Average items tracked per active device | > 10 |
| **Pair adoption** | % of users who create or join a pair | > 40% |
| **Notification opt-in** | % of users enabling notifications | > 60% |
| **Expired item rate** | % of items that reach expired status | < 5% |
| **Export usage** | % of users who export data at least once | Track |
| **D1 / D7 / D30 retention** | Standard cohort retention | D30 > 25% |

### 11.4 Analytics Infrastructure

- **Client:** `AnalyticsService` (singleton) → POST to `/analytics` endpoint
- **Backend:** Stores events in analytics pipeline (via Fastify route)
- **Monitoring:** Prometheus metrics for API health (request rate, latency, errors)
- **No third-party SDK:** Custom analytics only (no Firebase, no Amplitude)

---

## 12. Monetization Strategy

> **Status: Under evaluation.** Adapty SDK (v3.15.3) is integrated but not active.

### 12.1 Options Under Consideration

| Model | Free Tier | Paid Tier | Pros | Cons |
|---|---|---|---|---|
| **Freemium + Subscription** | Core features (categories, items, notifications) | Partner sync, unlimited history, photo attachments | Recurring revenue, aligns with server costs | Sync is a key feature — gating it may hurt adoption |
| **One-time Purchase** | Core features | Full unlock (all features forever) | Simple, user-friendly | No recurring revenue to cover server costs |
| **Free + Tips** | All features | Optional tip jar | Maximum adoption | Unpredictable revenue |
| **Free with Ads** | All features (with ads) | Ad-free purchase | Low barrier | Degrades UX in a utility app |

### 12.2 Recommended Approach (TBD)

A freemium model with partner sync as a premium feature is the most natural fit:
- Server costs scale with paired users (sync load)
- Solo users get full value for free → drives organic growth
- Pairs represent high-intent users willing to pay

### 12.3 Adapty Integration Status

- SDK initialized in `FreezerApp.swift` on app launch
- API key configured
- No paywall screens implemented yet
- No product configuration in App Store Connect

---

## 13. Localization

### 13.1 Supported Languages

| Language | Code | Status | Strings |
|---|---|---|---|
| Russian | `ru` | Complete | ~238 keys |
| English | `en` | Complete | ~238 keys |

### 13.2 Implementation

- **String files:** `ru.lproj/Localizable.strings`, `en.lproj/Localizable.strings`
- **Helpers:** `LK()` returns `LocalizedStringKey`, `LKS()` returns `String`
- **Runtime switching:** via `@AppStorage("appLanguage")`; updates `UserDefaults` `AppleLanguages` array; forces view refresh with `.id(appLanguage)`
- **Coverage:** All UI strings, error messages, alerts, notifications, empty states

### 13.3 Future Languages (Potential)

- Ukrainian, Kazakh (CIS market expansion)
- German, Spanish (European markets)

---

## 14. Current State & Roadmap

### 14.1 Current State (v0.7.6)

| Feature | Status |
|---|---|
| Category CRUD + reorder | Done |
| Item CRUD + quick actions | Done |
| Expiration indicators | Done |
| Search & shelf filter | Done |
| Local notifications | Done |
| Partner sync (backend) | Done |
| History / activity log | Done |
| Export / import | Done |
| Localization (RU + EN) | Done |
| Theme switching | Done |
| Analytics | Done |
| iCloud KVS sync | Implemented but disabled |
| Photo attachments | Data model ready, UI not implemented |
| Adapty / monetization | SDK integrated, no paywall |

### 14.2 Remaining for v1.0 Launch

| Task | Priority | Effort |
|---|---|---|
| Finalize monetization strategy and implement paywall | P0 | Medium |
| Onboarding / first-run experience | P0 | Medium |
| App Store assets (screenshots, description, metadata) | P0 | Medium |
| App icon finalization | P0 | Low |
| VoiceOver / accessibility audit | P1 | Medium |
| TestFlight beta testing | P0 | Low |
| Privacy policy & terms of service | P0 | Low |
| App Store review submission | P0 | Low |

### 14.3 Post-Launch Roadmap

| Phase | Features | Timeframe |
|---|---|---|
| **v1.1** | Photo attachments, Widgets (home screen), barcode/label scanning | Near-term |
| **v1.2** | Shopping list integration, recipe suggestions based on inventory | Medium-term |
| **v1.3** | Apple Watch companion app (quick view + quantity adjust) | Medium-term |
| **v1.4** | iPad optimization, multi-freezer support | Medium-term |
| **v2.0** | AI-powered expiration prediction, smart categories, meal planning | Long-term |

### 14.4 Deferred / Not in Scope

| Item | Reason |
|---|---|
| Android app | iOS-first strategy; revisit after validating product-market fit |
| Web app (React) | Exists as prototype; not maintained for v1.0 |
| Telegram Mini-App | Deferred to post-launch |
| iCloud KVS sync | Replaced by backend sync; kept behind feature flag |
| Social features | Out of scope; focus on household utility |

---

## 15. Risks & Mitigations

| # | Risk | Impact | Probability | Mitigation |
|---|---|---|---|---|
| R1 | Backend VPS downtime | Sync unavailable (local still works) | Medium | Offline-first design; monitor with Prometheus; backup VPS plan |
| R2 | Low pair adoption | Core differentiator underused | Medium | Optimize onboarding; prompt partner invite after first category |
| R3 | UserDefaults data loss | User loses all data | Low | Export reminders; consider migrating to SwiftData or Core Data |
| R4 | App Store rejection | Launch delay | Low | Follow HIG; prepare privacy policy early |
| R5 | Sync conflicts cause data inconsistency | User frustration | Low | Comprehensive conflict resolution; history log as audit trail |
| R6 | Notification permission denied | Key feature unavailable | Medium | Explain value before permission prompt; in-app expiration badge |
| R7 | 1 GB VPS insufficient at scale | Sync degradation | Low (early stage) | Postgres tuning applied; vertical scaling available; horizontal if needed |

---

## 16. Appendix

### A. Technology Stack Summary

| Layer | Technology |
|---|---|
| iOS UI | SwiftUI |
| iOS Minimum | iOS 18.1 |
| Local Storage | UserDefaults + Keychain |
| Networking | URLSession (native) |
| Backend | Fastify + PostgreSQL |
| Auth | JWT |
| Monitoring | Prometheus |
| Paywall | Adapty SDK 3.15.3 |
| CI/CD | Manual (Xcode → TestFlight) |
| Version Control | Git (GitHub) |

### B. Third-Party Dependencies

| Dependency | Version | Purpose | License |
|---|---|---|---|
| Adapty (iOS) | ~> 3.15.3 | Paywall/subscription management | Commercial |
| Fastify | ^4.26.0 | Backend web framework | MIT |
| @fastify/jwt | ^8.0.0 | JWT authentication | MIT |
| @fastify/rate-limit | ^9.1.0 | API rate limiting | MIT |
| @fastify/cors | ^9.0.1 | CORS support | MIT |
| pg | ^8.11.3 | PostgreSQL client | MIT |
| prom-client | ^15.1.2 | Prometheus metrics | Apache-2.0 |
| pino | ^8.19.0 | Structured logging | MIT |

### C. Environment Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | API server port |
| `NODE_ENV` | Runtime environment |
| `ADAPTY_API_KEY` | Adapty SDK key (iOS) |

### D. Contact & Resources

| Resource | Link |
|---|---|
| Figma Design | [Link](https://www.figma.com/design/ldv0VwJxMG8DfRvIIskA9z/Frozen-Food-Inventory-App) |
| Backend API | `https://apps.moone.dev` |
| Support Email | ceo@moone.dev |
| Repository | GitHub (private) |
