# Context Map

Полная карта проекта FreezerApp для быстрого восстановления контекста.
Последнее обновление: 2026-04-04.

---

## 1. Что это

**FreezerApp ("Морозилка")** — приложение для учёта продуктов в морозильной камере. Позволяет создавать категории, добавлять продукты с датами заморозки и сроком годности, получать уведомления о скором истечении, делиться холодильником с партнёром через облачную синхронизацию.

**Монорепо с тремя компонентами:**

| Компонент | Путь | Стек | Прод URL |
|-----------|------|------|----------|
| iOS app | `FreezerApp/` | SwiftUI, iOS 18.1+ | App Store (pre-launch) |
| Web app | `src/` | React 18, TS, Vite, Tailwind | https://freezer.moone.dev |
| Backend | `backend/` | Fastify, TS, PostgreSQL, JWT | https://api.freezer.moone.dev |

**Мониторинг:** Grafana + Prometheus + Loki в `monitoring/`, доступ: https://monitor.moone.dev

**Деплой:** Dokploy (Docker Swarm) на `77.90.43.8`, автодеплой из `main`. DNS через CloudFlare (DNS-only), TLS через Let's Encrypt / Traefik.

---

## 2. Архитектура синхронизации (ключевая механика)

Синхронизация — ядро проекта. Оба клиента (iOS, Web) используют одну и ту же схему:

### Протокол

```
Client                              Server
  │  POST /sync                        │
  │  { last_known_version: 42,         │
  │    changes: {                      │
  │      categories: [...],            │
  │      items: [...],                 │
  │      history: [...] }}             │
  │ ──────────────────────────────────►│
  │                                    │ Применяет изменения, инкрементирует server_version
  │                                    │ Разрешает конфликты (last-write-wins по updatedAt)
  │  { server_version: 47,            │
  │    applied_changes: N,             │
  │    server_changes: {               │
  │      categories: [...],            │
  │      items: [...],                 │
  │      history: [...] }}             │
  │ ◄──────────────────────────────────│
  │  Мержит server_changes локально    │
```

### Ключевые принципы
- **Pair-based:** данные принадлежат паре (pair), не отдельному пользователю
- **Monotonic server_version:** каждая пара имеет счётчик, инкрементируется при каждом изменении
- **Last-write-wins:** конфликты разрешаются по `updatedAt` timestamp; при равенстве — побеждает сервер
- **Soft deletes:** `deletedAt` поле; удаление с более поздним timestamp побеждает update
- **Offline-first:** изменения копятся в pendingChanges, отправляются при восстановлении сети
- **Polling 5 секунд:** клиент запрашивает /sync каждые 5 секунд при активной паре
- **History — append-only:** события истории никогда не обновляются и не удаляются на сервере

### Пара (Pair)

Три режима:
- `personal` — solo-пара, создаётся при регистрации ("Мой холодильник")
- `shared` — совместная пара (два пользователя)
- `none` — нет активной пары

**Создание:** пользователь создаёт shared pair → получает 6-значный invite code (24h, одноразовый)
**Присоединение:** партнёр вводит код → два режима импорта: `replace` (заменить данные) или `merge` (объединить)
**Выход:** при выходе из shared pair создаётся новая personal pair

---

## 3. iOS приложение (`FreezerApp/`)

### Структура файлов

```
FreezerApp/
├── App/FreezerApp.swift              — Entry point, auth gate, language, env objects
├── Core/
│   ├── Repository/DataRepository.swift — CRUD, soft deletes, sync queue, iCloud fallback
│   ├── Services/
│   │   ├── SyncService.swift          — Pair create/join/leave, 5s periodic sync
│   │   ├── APIClient.swift            — HTTP client, token refresh, base URL
│   │   └── KeychainService.swift      — Secure storage (tokens, IDs)
│   ├── Models/
│   │   ├── Category.swift             — id, name, icon, color, sortOrder, soft delete
│   │   ├── Item.swift                 — id, name, packages/items count, shelf, dates, notes
│   │   ├── Pair.swift                 — id, name, serverVersion
│   │   ├── HistoryEvent.swift         — type, itemId, deltas, timestamp
│   │   └── SyncStatus.swift           — idle/syncing/success/offline/error/pendingChanges
│   ├── FeatureFlags.swift             — is_icloud_sync_active = false
│   ├── Localization.swift             — LK(), LKS(), russianPlural()
│   ├── NotificationService.swift      — UNUserNotificationCenter, expiration reminders
│   ├── BackupService.swift            — JSON export/import
│   └── AnalyticsService.swift         — Event tracking to /analytics
├── Features/
│   ├── Categories/Views/
│   │   ├── CategoryListView.swift     — Main screen: expandable categories, search, toolbar
│   │   └── CategoryFormView.swift     — Add/edit category (name, icon, color)
│   ├── Items/Views/
│   │   ├── ItemListView.swift         — Items in category, search, shelf filter
│   │   └── ItemFormView.swift         — Add/edit item form
│   └── Settings/
│       ├── SettingsView.swift         — Backup, appearance, notifications, sync, account
│       ├── CreatePairView.swift       — Create pair, show invite code
│       └── JoinPairView.swift         — Join pair with code
├── UI/
│   ├── Theme/Theme.swift              — Colors, typography, spacing, presets
│   └── Components/
│       ├── ItemRow.swift              — Item card with swipe actions
│       └── CategoryCard.swift         — Category header
├── en.lproj/Localizable.strings       — English (~238 keys)
└── ru.lproj/Localizable.strings       — Russian (~238 keys)
```

### Навигация

```
AuthGateView (login/register)
    ↓ [authenticated]
CategoryListView (root)
    ├─ → ItemListView (tap category, NavigationLink push)
    │    ├─ Sheet: ItemFormView
    │    └─ ItemRow quick actions (±, edit, delete)
    ├─ Sheet: CategoryFormView
    ├─ Sheet: SettingsView
    │    ├─ Sheet: CreatePairView
    │    └─ Sheet: JoinPairView
    └─ Toolbar: HistoryView (separate file: HistoryView.swift)
```

### Поток данных

```
User Action → DataRepository (CRUD, @Published)
    → Save to UserDefaults (JSON-encoded)
    → Queue PendingChange to SyncService
    → SyncService.performSync() → APIClient.sync()
    → Server response → NotificationCenter .didReceiveServerChanges
    → DataRepository.mergeEntities() → UI updates
```

### Auth flow
- `AuthState` (ObservableObject): bootstrap → login/register → APIClient → persistAuth
- Tokens в Keychain: accessToken, refreshToken, userId, pairId, deviceId
- Auto refresh на 401; logout при .didAuthExpired notification

### Хранение
- **UserDefaults:** categories, items, history (JSON)
- **@AppStorage:** appLanguage, appearanceMode, notificationsEnabled, notificationDays
- **Keychain:** accessToken, refreshToken, userId, pairId, deviceId
- **NSUbiquitousKeyValueStore:** disabled (FeatureFlags.is_icloud_sync_active = false)

### Локализация
- `Localization.swift`: `LK(key)` → LocalizedStringKey, `LKS(key)` → String
- `russianPlural(count, one:, few:, many:)` — правила склонения
- Переключение в runtime: `@AppStorage("appLanguage")` + `applyPreferredLanguage()`
- Многие строки захардкожены на русском (🇷🇺-first)

### Тема
- Файл: `UI/Theme/Theme.swift`
- Primary: #5B9FD3 (light) / #64A9DC (dark)
- Background: #F2F7FA (light) / #000000 (dark)
- 30 preset emoji icons, 8 preset hex colors для категорий

---

## 4. Web приложение (`src/`)

### Структура файлов

```
src/
├── main.tsx                    — Точка входа, рендер <App />
├── App.tsx                     — Оболочка (~560 строк): state, callbacks, router
├── lib/
│   ├── copy.ts                 — Словари COPY (ru/en), PRESET_ICONS, PRESET_COLORS
│   ├── helpers.ts              — Утилиты: getItemsWord, getDaysWord, getExpirationState, etc.
│   └── types.ts                — Типы пропсов экранов: CategoryDraft, ItemDraft, ScreenProps, etc.
├── screens/
│   ├── AuthScreen.tsx           — Экран авторизации (login/register)
│   ├── HomeScreen.tsx           — Главный экран (категории, поиск, фильтры)
│   ├── CategoryScreen.tsx       — Детали категории (список продуктов)
│   ├── ItemFormScreen.tsx       — Форма продукта
│   ├── HistoryScreen.tsx        — Экран истории
│   ├── SettingsScreen.tsx       — Настройки
│   ├── CategoryModalSheet.tsx   — Модал категории (create/edit)
│   └── PairModalSheet.tsx       — Модал пары (create/join)
├── domain/
│   ├── models.ts               — TypeScript интерфейсы (AppState, Category, Item, etc.)
│   ├── contracts.ts            — DTO для API (snake_case)
│   └── mappers.ts              — Конвертеры domain ↔ API, withCategoryCounts()
├── services/
│   ├── storage.ts              — localStorage persistence (key: 'freezer-web-state-v2')
│   ├── api-client.ts           — HTTP client, auth, pair, sync, analytics
│   ├── sync-engine.ts          — compactPendingChanges(), applyServerChanges()
│   ├── notifications.ts        — Web Notifications API, service worker
│   ├── backup.ts               — JSON export/import
│   └── analytics.ts            — Event tracking
├── components/
│   ├── ItemRow.tsx              — Карточка продукта, swipe, ±
│   ├── CategoryCard.tsx         — Карточка категории, drag-reorder
│   ├── ItemForm.tsx             — Форма продукта
│   ├── ItemList.tsx             — Список продуктов
│   ├── CategoryList.tsx         — Список категорий
│   ├── CategoryModal.tsx        — Модал создания/редактирования категории
│   └── ui/                      — Radix UI компоненты (shadcn/ui)
└── styles/
    ├── globals.css              — Design tokens (oklch colors, light/dark)
    └── app.css                  — iOS-inspired theme (SF Pro Text)
```

### Архитектура

- **Нет React Router** — маршрутизация через `state.screen`: `home | category | item-form | history | settings`
- **Нет Redux/Zustand** — всё состояние в `useState<AppState>` + `useRef` для производительности
- **App.tsx** — тонкая оболочка (state + callbacks), JSX экранов в `screens/`
- **Persistence:** весь AppState сериализуется в localStorage при каждом изменении
- **Sync:** тот же протокол что и iOS — 5-секундный интервал при активной паре
- **Feature flags:** `web_sync_engine`, `web_settings_v2`, `web_notifications`

### Ключевые отличия от iOS
- App.tsx — монолит (2150+ строк) vs iOS — разделение по файлам
- localStorage vs UserDefaults/Keychain
- Web Notifications API vs UNUserNotificationCenter
- Нет iCloud fallback
- Переводы inline (`COPY.ru` / `COPY.en` объект) vs .lproj файлы

---

## 5. Backend (`backend/`)

### Структура файлов

```
backend/src/
├── index.ts                    — Bootstrap: DB connect, register routes, graceful shutdown
├── server.ts                   — Fastify config: CORS, JWT, rate limit, health, metrics
├── config/database.ts          — PostgreSQL pool (max 10, retry 5x)
├── routes/
│   ├── auth.ts                 — POST /auth/register, /login, /refresh, /logout, GET /me
│   ├── pair.ts                 — POST /pair/create, /invite, /join, /leave
│   ├── sync.ts                 — POST /sync, GET /sync/status
│   └── analytics.ts            — POST /analytics (fire-and-forget)
├── services/
│   ├── auth.ts                 — Password hash (Argon2id), token issue, session management
│   ├── conflict-resolver.ts    — Last-write-wins logic
│   └── pair-data.ts            — loadPairSyncData(), copyPairSnapshot() for merge import
├── middleware/auth.ts           — JWT verify, session check, pair membership validation
├── utils/
│   ├── errors.ts               — AppError, ValidationError, UnauthorizedError, NotFoundError
│   ├── invite-code.ts          — 6 chars (A-Z, 2-9, без I/O/0/1)
│   ├── key-transform.ts        — camelCase ↔ snake_case (22 explicit mappings)
│   ├── logger.ts               — Pino (pretty dev, JSON prod)
│   └── metrics.ts              — Prometheus: request duration, error count, auth counters
└── models/types.ts             — TypeScript типы для API
```

### API Endpoints

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/auth/register` | No | Регистрация, создаёт personal pair |
| POST | `/auth/login` | No | Вход, возвращает tokens + pair context |
| POST | `/auth/refresh` | No | Ротация refresh token |
| POST | `/auth/logout` | Bearer | Отзыв сессии |
| GET | `/auth/me` | Bearer | Текущий пользователь + pair context |
| POST | `/pair/create` | Bearer | Создать shared pair |
| POST | `/pair/invite` | Bearer | Сгенерировать invite code |
| POST | `/pair/join` | Bearer | Присоединиться (replace/merge) |
| POST | `/pair/leave` | Bearer | Покинуть pair |
| POST | `/sync` | Bearer | Двусторонняя синхронизация |
| GET | `/sync/status` | Bearer | Текущая server_version, members |
| POST | `/analytics` | No | Логирование событий |
| GET | `/health` | No | Health check |
| GET | `/metrics` | Optional | Prometheus metrics |

### База данных (PostgreSQL 15)

```
users           — id, name, email, password_hash, is_account, personal_pair_id, active_pair_id
auth_sessions   — refresh_token_hash (SHA256), device metadata, revoked_at
pairs           — id, name, server_version (BIGINT), timestamps
pair_members    — pair_id, user_id, role (owner/member); UNIQUE on user_id
invites         — code (6 chars, PK), pair_id, expires_at, used_by/used_at
categories      — id, pair_id, name, icon, color, sort_order, updated_at, deleted_at, server_version
items           — id, pair_id, category_id, name, packages/items/shelf, dates, notes, server_version
history_events  — id, pair_id, type, item_id, deltas, timestamp, server_version
```

Миграции: `backend/migrations/001_initial.sql` ... `004_account_auth.sql`, трекинг через `_migrations` table.

### Безопасность
- JWT access tokens: 15 минут
- Refresh tokens: 30 дней, SHA256 hash в БД, ротация при каждом refresh
- Argon2id для паролей (memoryCost=19456, timeCost=2)
- Rate limiting: 100 req/min global, усиленное на auth endpoints
- Все операции в транзакциях с `FOR UPDATE` locks
- Invite codes: 6 символов, 24h TTL, одноразовые

### Docker

```yaml
# docker-compose.yml
postgres:15-alpine  — shared_buffers=64MB, work_mem=4MB, max_connections=20
api (Node 20)       — PORT=3000, depends_on postgres
```

---

## 6. Модель данных (общая для всех компонентов)

### Category
```
id: UUID (lowercased string)
name: String (required)
icon: String? (emoji)
color: String? (hex #RRGGBB)
itemCount: Int (computed)
sortOrder: Int?
updatedAt: Date (ISO 8601)
deletedAt: Date? (soft delete)
```

### Item
```
id: UUID
name: String (required)
packagesCount: Int (default 1)
itemsCount: Int (default 1)
shelfNumber: Int (1-20)
freezeDate: Date
expirationDate: Date
notes: String?
photoUrl: String? (reserved)
categoryId: UUID (FK → Category)
updatedAt: Date
deletedAt: Date?
```

**Expiration logic:**
- Fresh (green): > 30 дней
- Expiring soon (yellow): 0-30 дней
- Expired (red): < 0 дней

### HistoryEvent
```
id: UUID
type: itemAdded | itemUpdated | itemDeleted | packagesChanged | itemsChanged
itemId: UUID?
categoryId: UUID?
itemName: String
packagesDelta: Int?
itemsDelta: Int?
timestamp: Date
updatedAt: Date
deletedAt: Date?
```

Лимит: 500 последних событий.

---

## 7. Мониторинг (`monitoring/`)

Контейнеризированный стек:

| Сервис | Порт | Назначение |
|--------|------|-----------|
| Grafana | 3001 | Дашборды, алерты |
| Prometheus | 9090 | Метрики (CPU, RAM, Docker, API) |
| Loki | 3100 | Логи Docker контейнеров |
| cAdvisor | 8080 | Метрики Docker |
| Node Exporter | 9100 | Системные метрики |
| Promtail | — | Агент для отправки логов в Loki |

Доступ: https://monitor.moone.dev, auth credentials в `docs/monitoring-access.md`.

---

## 8. Конвенции

- **Язык UI:** русский (primary), английский
- **Коммиты:** lowercase, `feat:`, `fix:`, или plain description
- **iOS min:** 18.1
- **Тесты:** нет автоматических тестов
- **Deploy:** push в `main` → auto-deploy (Dokploy)
- **Key transform:** backend принимает и camelCase и snake_case, iOS модели используют CodingKeys
- **API sync response:** top-level keys в snake_case, entity keys в camelCase

---

## 9. Известные нюансы и подводные камни

1. **App.tsx — монолит (2150 строк):** веб-приложение не разделено на модули, вся логика в одном файле
2. **Hardcoded русские строки в iOS:** многие строки в коде на русском, а не через LK()/LKS()
3. **iCloud sync выключен:** FeatureFlags.is_icloud_sync_active = false, код есть но не используется
4. **Adapty SDK удалён:** упоминается в PRD, но SDK был удалён из проекта (коммит bc3fccd)
5. **Web dev port:** `vite.config.ts` ставит port 5174, CLAUDE.md тоже говорит 5174, но README говорит 3000
6. **Нет тестов:** ни unit, ни integration, ни e2e
7. **Key transform:** 22 explicit mappings в `key-transform.ts` — при добавлении полей надо добавлять маппинги
8. **History append-only на сервере:** события истории никогда не обновляются, только добавляются
9. **Pair constraint:** пользователь может быть только в 1 паре одновременно (UNIQUE INDEX)
10. **src/components/ui/:** ~40 Radix UI обёрток, большинство не используются активно

---

## 10. Карта быстрого старта по типу задачи

### iOS задача
1. `FreezerApp/App/FreezerApp.swift` — entry point, auth
2. `FreezerApp/Core/Repository/DataRepository.swift` — бизнес-логика
3. `FreezerApp/Core/Services/SyncService.swift` — синхронизация
4. `FreezerApp/Features/*/Views/` — UI по фиче
5. Build: `xcodebuild build -project FreezerApp/FreezerApp.xcodeproj -scheme FreezerApp -destination 'generic/platform=iOS'`

### Backend задача
1. `backend/src/server.ts` — конфигурация Fastify
2. `backend/src/routes/` — нужный route файл
3. `backend/src/services/` — бизнес-логика
4. `backend/migrations/` — схема БД
5. Run: `cd backend && npm run dev`

### Web задача
1. `src/App.tsx` — всё здесь (state, routing, handlers)
2. `src/domain/models.ts` — типы
3. `src/services/` — нужный сервис
4. `src/components/` — UI компонент
5. Run: `npm run dev`

### Sync / API задача
1. `backend/src/routes/sync.ts` — серверная сторона
2. `backend/src/services/conflict-resolver.ts` — разрешение конфликтов
3. `FreezerApp/Core/Services/SyncService.swift` — iOS клиент
4. `src/services/sync-engine.ts` — Web клиент
5. `backend/src/utils/key-transform.ts` — маппинг ключей

---

## 11. Ссылки на документацию

| Документ | Путь | Содержание |
|----------|------|-----------|
| PRD | `docs/prd.md` | Полные требования, user stories, roadmap, data model |
| Repo Map | `docs/repo-nfo.md` | Карта файлов, поведение, gotchas |
| Backend README | `docs/backend.md` | API, деплой, troubleshooting, бэкапы |
| Monitoring | `docs/monitoring-access.md` | Доступы Grafana, управление |
| Attributions | `docs/attributions.md` | Лицензии shadcn/ui, Unsplash |
| CLAUDE.md | `CLAUDE.md` (root) | Инструкции для Claude Code |
| README | `README.md` (root) | Обзор проекта |
