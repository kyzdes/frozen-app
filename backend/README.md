# FreezerApp Sync Backend

Легковесный бэкенд для синхронизации данных FreezerApp между устройствами пары пользователей.

## Особенности

- **Легковесный**: работает на VPS с 1 Core / 1GB RAM
- **Last-Write-Wins**: автоматическое разрешение конфликтов
- **Офлайн режим**: поддержка работы без интернета с отложенной синхронизацией
- **Безопасность**: JWT авторизация, rate limiting, HTTPS обязательно
- **Простота**: без регистрации, присоединение по 6-значному коду

## Стек технологий

- Node.js 20 + TypeScript
- Fastify (быстрый веб-фреймворк)
- PostgreSQL 15 (ACID транзакции)
- Docker Compose (развертывание)
- Nginx + Let's Encrypt (SSL reverse proxy)

## Структура проекта

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Подключение к PostgreSQL
│   ├── middleware/
│   │   └── auth.ts               # JWT авторизация
│   ├── models/
│   │   └── types.ts              # TypeScript типы для API
│   ├── routes/
│   │   ├── pair.ts               # Endpoints управления парами
│   │   └── sync.ts               # Endpoints синхронизации
│   ├── services/
│   │   └── conflict-resolver.ts  # Алгоритм Last-Write-Wins
│   ├── utils/
│   │   ├── errors.ts             # Кастомные ошибки
│   │   ├── logger.ts             # Pino logger
│   │   └── invite-code.ts        # Генератор кодов
│   ├── server.ts                 # Fastify конфигурация
│   └── index.ts                  # Точка входа
├── migrations/
│   ├── 001_initial.sql           # Схема БД
│   └── run.js                    # Скрипт миграций
├── docker/
│   └── .env.production           # Шаблон env переменных
├── Dockerfile                     # Docker образ API
├── docker-compose.yml             # Оркестрация контейнеров
├── nginx.conf                     # Конфигурация Nginx
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Управление парами

**POST /pair/create**
- Создает новый холодильник и возвращает invite код
- Body: `{ device_id: string, pair_name?: string }`
- Response: `{ pair_id, user_id, invite_code, token, server_version }`

**POST /pair/join**
- Присоединяется к холодильнику по коду
- Body: `{ device_id: string, invite_code: string }`
- Response: `{ pair_id, user_id, token, server_version, initial_data }`
- Rate limit: 5 попыток в час

**POST /pair/leave**
- Покидает холодильник
- Headers: `Authorization: Bearer <token>`
- Response: `{ success: true }`

### Синхронизация

**POST /sync**
- Двусторонняя синхронизация данных
- Headers: `Authorization: Bearer <token>`
- Body: `{ last_known_version: number, changes: { categories, items, history } }`
- Response: `{ server_version, applied_changes, server_changes }`

**GET /sync/status**
- Статус синхронизации
- Headers: `Authorization: Bearer <token>`
- Response: `{ server_version, pair_id, members_count, last_activity }`

### Утилиты

**GET /health**
- Health check
- Response: `{ status: "ok", timestamp }`

## Локальная разработка

### Требования

- Node.js 20+
- PostgreSQL 15+ (или Docker)
- npm или yarn

### Установка

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env файл
cp .env.example .env

# 3. Настроить переменные окружения
# Отредактируйте .env и заполните:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (минимум 32 символа)

# 4. Запустить PostgreSQL (через Docker)
docker run -d \
  --name freezer-postgres \
  -e POSTGRES_DB=freezer \
  -e POSTGRES_USER=freezer \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15-alpine

# 5. Запустить миграции
npm run migrate

# 6. Запустить сервер в режиме разработки
npm run dev
```

Сервер запустится на `http://localhost:3000`

### Генерация секретов

```bash
# DB Password
openssl rand -base64 32

# JWT Secret (минимум 32 символа)
openssl rand -base64 64
```

## Развертывание на VPS

### Требования VPS

- Ubuntu 22.04 LTS (или новее)
- 1 vCore CPU
- 1GB RAM
- 25GB SSD
- Публичный IP
- Домен или поддомен (для SSL)

### Подготовка сервера

```bash
# 1. Подключиться к VPS
ssh user@your-vps-ip

# 2. Обновить систему
sudo apt update && sudo apt upgrade -y

# 3. Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. Установить Docker Compose
sudo apt install docker-compose-plugin

# 5. Установить Nginx
sudo apt install nginx

# 6. Установить Certbot (для SSL)
sudo apt install certbot python3-certbot-nginx

# 7. Настроить firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Развертывание приложения

```bash
# 1. Создать директорию для проекта
mkdir -p ~/freezer-backend
cd ~/freezer-backend

# 2. Скопировать файлы проекта на сервер
# (используйте git clone, scp, или rsync)
# Например:
git clone <your-repo> .

# 3. Создать .env файл
cat > .env <<EOF
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
EOF

# 4. Запустить контейнеры
docker compose up -d

# 5. Проверить логи
docker compose logs -f

# 6. Запустить миграции БД
docker compose exec api npm run migrate

# 7. Проверить health check
curl http://localhost:3000/health
```

### Настройка Nginx + SSL

```bash
# 1. Скопировать конфигурацию Nginx
sudo cp nginx.conf /etc/nginx/sites-available/freezer-api

# 2. Заменить your-domain.com на ваш домен
sudo sed -i 's/api.your-domain.com/api.your-actual-domain.com/g' \
  /etc/nginx/sites-available/freezer-api

# 3. Создать symlink
sudo ln -s /etc/nginx/sites-available/freezer-api \
  /etc/nginx/sites-enabled/

# 4. Проверить конфигурацию
sudo nginx -t

# 5. Перезапустить Nginx
sudo systemctl restart nginx

# 6. Получить SSL сертификат (Let's Encrypt)
sudo certbot --nginx -d api.your-actual-domain.com

# 7. Настроить автообновление сертификата
sudo certbot renew --dry-run
```

### Проверка работы

```bash
# 1. Health check
curl https://api.your-domain.com/health

# 2. Создать тестовую пару
curl -X POST https://api.your-domain.com/pair/create \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test-device-123","pair_name":"Test Freezer"}'

# Ответ должен содержать invite_code и token
```

## Мониторинг и обслуживание

### Логи

```bash
# API логи
docker compose logs -f api

# PostgreSQL логи
docker compose logs -f postgres

# Nginx логи
sudo tail -f /var/log/nginx/freezer-api.access.log
sudo tail -f /var/log/nginx/freezer-api.error.log
```

### Использование ресурсов

```bash
# Docker stats
docker stats

# Системные ресурсы
htop

# Размер БД
docker compose exec postgres psql -U freezer -c "\l+"
```

### Бэкапы PostgreSQL

```bash
# 1. Создать скрипт бэкапа
cat > ~/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker compose -f ~/freezer-backend/docker-compose.yml \
  exec -T postgres pg_dump -U freezer freezer | \
  gzip > "$BACKUP_DIR/freezer_$DATE.sql.gz"
find $BACKUP_DIR -name "freezer_*.sql.gz" -mtime +7 -delete
EOF

# 2. Сделать исполняемым
chmod +x ~/backup-db.sh

# 3. Добавить в cron (каждый день в 3:00)
crontab -e
# Добавить строку:
# 0 3 * * * /home/your-user/backup-db.sh

# 4. Тестовый запуск
~/backup-db.sh
```

### Восстановление из бэкапа

```bash
# 1. Найти бэкап
ls -lh ~/backups/

# 2. Восстановить
gunzip < ~/backups/freezer_20250101_030000.sql.gz | \
  docker compose exec -T postgres psql -U freezer freezer
```

### Обновление приложения

```bash
cd ~/freezer-backend

# 1. Остановить контейнеры
docker compose down

# 2. Обновить код (git pull или скопировать новые файлы)
git pull

# 3. Пересобрать образы
docker compose build

# 4. Запустить контейнеры
docker compose up -d

# 5. Проверить логи
docker compose logs -f api
```

## Оценка ресурсов

**VPS с 1GB RAM:**
- PostgreSQL: ~100-150MB
- Node.js API: ~50-100MB
- Nginx: ~10-20MB
- Система (Ubuntu): ~150-200MB
- **Итого:** ~310-470MB (запас 530-690MB)

**Поддерживаемая нагрузка:**
- 10-20 активных пар одновременно
- 100+ пар всего (с периодической активностью)
- ~5-10 запросов в секунду на пару

## Troubleshooting

### API не запускается

```bash
# Проверить логи
docker compose logs api

# Проверить подключение к БД
docker compose exec postgres psql -U freezer -c "SELECT NOW()"

# Проверить переменные окружения
docker compose exec api env | grep DATABASE_URL
```

### БД недоступна

```bash
# Проверить статус контейнера
docker compose ps postgres

# Перезапустить PostgreSQL
docker compose restart postgres

# Проверить логи
docker compose logs postgres
```

### Nginx ошибки

```bash
# Проверить конфигурацию
sudo nginx -t

# Проверить доступность API
curl http://localhost:3000/health

# Проверить логи
sudo tail -100 /var/log/nginx/freezer-api.error.log
```

### SSL сертификат истек

```bash
# Обновить сертификат вручную
sudo certbot renew

# Перезапустить Nginx
sudo systemctl restart nginx
```

## Лицензия

MIT

## Поддержка

Для вопросов и багрепортов создавайте issue в GitHub репозитории.
