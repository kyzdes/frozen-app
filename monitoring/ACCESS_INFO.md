# 🎉 Мониторинг успешно развернут!

## 📊 Доступы к Grafana

### URL (после настройки DNS):
**https://monitor.moone.dev**

### Учетные данные:
- **Username:** `admin`
- **Password:** `tZfNLJkVceds0LUuP9kp5Lwo`

---

## 🌐 Настройка DNS (ВАЖНО!)

Для доступа к Grafana нужно добавить DNS-запись:

### Вариант 1: A-запись (рекомендуется)
```
Тип: A
Имя: monitor.moone.dev
Значение: 89.22.237.148
TTL: 300
```

### Вариант 2: CNAME (если monitor - поддомен)
```
Тип: CNAME
Имя: monitor
Значение: apps.moone.dev
TTL: 300
```

**После добавления DNS ждите 5-15 минут для распространения изменений.**

---

## 📈 Что доступно в мониторинге

### 1. **Grafana** (Веб-интерфейс)
- Визуализация метрик и логов
- Дашборды
- Алерты
- URL: https://monitor.moone.dev

### 2. **Prometheus** (Метрики)
- Системные метрики (CPU, RAM, Disk)
- Docker контейнеры (через cAdvisor)
- API метрики
- Доступ через Grafana data source

### 3. **Loki** (Логи)
- Все логи Docker контейнеров
- Системные логи
- Полнотекстовый поиск
- Доступ через Grafana data source

---

## 🚀 Первый вход

1. Откройте https://monitor.moone.dev (после настройки DNS)
2. Введите логин и пароль
3. Grafana автоматически настроена с источниками данных:
   - **Prometheus** (метрики)
   - **Loki** (логи)

---

## 📚 Полезные запросы для начала

### Prometheus (метрики):
```promql
# Использование CPU контейнерами
rate(container_cpu_usage_seconds_total{name!=""}[5m])

# Использование памяти
container_memory_usage_bytes{name!=""}

# Статус контейнеров
container_last_seen{name!=""}
```

### Loki (логи):
```logql
# Все логи Freezer API
{container="freezer-api"}

# Ошибки в API
{container="freezer-api"} |= "error" or |= "ERROR"

# Логи за последний час
{container="freezer-api"} | json | __timestamp__ > 1h ago
```

---

## 🔧 Управление мониторингом

### Остановить мониторинг:
```bash
ssh root@89.22.237.148
cd /root/monitoring
docker compose down
```

### Запустить мониторинг:
```bash
ssh root@89.22.237.148
cd /root/monitoring
docker compose up -d
```

### Посмотреть логи:
```bash
ssh root@89.22.237.148
cd /root/monitoring
docker compose logs -f grafana    # Логи Grafana
docker compose logs -f prometheus # Логи Prometheus
docker compose logs -f loki       # Логи Loki
```

### Проверить статус:
```bash
ssh root@89.22.237.148
cd /root/monitoring
docker compose ps
```

---

## 📦 Установленные сервисы

| Сервис | Порт (локальный) | Описание |
|--------|------------------|----------|
| Grafana | 3001 | Веб-интерфейс мониторинга |
| Prometheus | 9090 | Сбор метрик |
| Loki | 3100 | Сбор логов |
| cAdvisor | 8080 | Метрики Docker |
| Node Exporter | 9100 | Системные метрики |
| Promtail | - | Агент для отправки логов |

---

## 🔒 Безопасность

- ✅ Все сервисы работают только на localhost (127.0.0.1)
- ✅ Доступ снаружи только через Nginx с SSL
- ✅ Автоматический HTTPS через Let's Encrypt
- ✅ Пароль администратора хранится в .env файле

---

## 💾 Хранение данных

### Метрики (Prometheus):
- Хранятся 15 дней
- Volume: `prometheus_data`

### Логи (Loki):
- Хранятся 30 дней
- Volume: `loki_data`

### Настройки Grafana:
- Volume: `grafana_data`

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте статус контейнеров: `docker compose ps`
2. Посмотрите логи: `docker compose logs [service-name]`
3. Перезапустите проблемный сервис: `docker compose restart [service-name]`

---

**Мониторинг готов к использованию! 🎉**
