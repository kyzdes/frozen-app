## Backend контекст (MVP синхронизации)

Цель: лёгкий сервер для синхронизации данных «пары» пользователей (категории, заготовки, история) на VPS 1 vCPU / 1 GB RAM.

### Архитектура
- API: REST/JSON (Fastify или Go/Fiber). Эндпоинт `/sync` для дельт, `/pair/create` и `/pair/join` для пары/токена, `/history` для просмотра журнала.
- БД: Postgres (можно SQLite для прототипа, но Postgres лучше для конкуренции). Счётчик версий в `pairs` для дельт.
- Reverse proxy: Nginx + TLS (certbot). Rate limit на `/sync`.
- Хранение: таблицы `users`, `pairs`, `pair_members`, `invites`, `categories`, `items`, `history`.
- Синх: версия `server_version BIGINT` (инкремент на каждое изменение). Клиент хранит `last_version` и `pending` изменения, присылает батч; сервер применяет, возвращает изменения `server_version > last_version`.
- Конфликты: стратегия «последняя запись по времени/версии». Удаления — soft delete через `deleted_at`.

### Схема БД (Postgres)
```
users (id UUID PK, email TEXT NULL, created_at TIMESTAMPTZ DEFAULT now())
pairs (id UUID PK, name TEXT, server_version BIGINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now())
pair_members (pair_id FK -> pairs, user_id FK -> users, role TEXT, joined_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY(pair_id, user_id))
invites (code TEXT UNIQUE, pair_id FK, expires_at TIMESTAMPTZ, used BOOL DEFAULT false)

categories (id UUID PK, pair_id FK, name TEXT, icon TEXT NULL, color TEXT NULL,
            sort_order INT, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL,
            server_version BIGINT)
items (id UUID PK, pair_id FK, category_id FK, name TEXT,
       packages INT, items INT, shelf INT, freeze_date DATE, expiration_date DATE,
       notes TEXT, photo_url TEXT,
       updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL,
       server_version BIGINT)

history (id UUID PK, pair_id FK, item_id UUID NULL, event_type TEXT,
         payload JSONB, created_at TIMESTAMPTZ DEFAULT now(),
         server_version BIGINT)
```
Индексы: `categories(pair_id, server_version)`, `items(pair_id, server_version)`, `history(pair_id, server_version)`, `items(category_id)`, `invites(code)`.

### API контракт
- Auth/Pair: `POST /pair/create` → создаёт пару, возвращает токен (JWT с pair_id, user_id); `POST /pair/join` (код).
- Sync: `POST /sync`  
  - Request: `last_version`, `changes: { categories: [...], items: [...] }` (каждая запись: `id`, `fields...`, `updated_at`, `deleted_at?`).  
  - Response: `server_version`, `server_changes` (categories/items/history с `server_version > last_version`).
- History: `GET /history?from_version=&limit=` (или `from_date/to_date`), возвращает события и `current_version`.

### Логика синка
- Сервер увеличивает `pairs.server_version` на каждое принятое изменение (BATched). Запись получает свой `server_version`.
- При конфликте берём запись с более новым `updated_at` и/или `server_version`. Мягкие удаления (`deleted_at`) побеждают, если новее.
- История пишется на каждый add/update/delete/qty-change.

### Деплой на VPS 1GB
- Postgres: `shared_buffers=64MB`, `work_mem=4MB`, `max_connections≈20`.
- API один процесс (Fastify/Go). Nginx как proxy + TLS.
- Бэкапы: cron `pg_dump`, опционально rclone/S3.

### Клиентские изменения (iOS/Web)
- Слой синка: хранить `last_version`, pending changes, помечать записи `deleted_at` вместо удаления.
- Обработка конфликтов: если пришла более новая запись — заменить; история для аудита.
- Экспорт/импорт: включить `server_version`, `deleted_at`, историю (`history`) для оффлайна.
