# Морозилка - Учёт заготовок

Кросс-платформенное приложение для учета домашних заготовок в холодильнике/морозилке.

## 📱 Доступные платформы

| Платформа | Статус | Технология | Директория |
|-----------|--------|------------|------------|
| **Web App** | ✅ Готово | React + TypeScript + Vite | `/` (корень) |
| **iOS Native** | ✅ Готово | SwiftUI | `/ios-app` |
| Android Native | 🔜 Планируется | Kotlin + Jetpack Compose | - |
| Telegram Mini-App | 🔜 Планируется | React + TWA SDK | - |

## 🚀 Быстрый старт

### Web приложение

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка для продакшена
npm run build
```

Приложение откроется на `http://localhost:5173`

### iOS приложение

1. Откройте Xcode (требуется macOS + Xcode 15+)
2. Следуйте инструкциям в [`ios-app/SETUP_GUIDE.md`](ios-app/SETUP_GUIDE.md)
3. Или прочитайте [`ios-app/README.md`](ios-app/README.md)

**Быстрая установка:**
- Распакуйте `freezer-ios-app.tar.gz`
- Создайте новый Xcode проект
- Добавьте файлы из `ios-app/FreezerApp`

## ✨ Функциональность

### Категории
- ✅ Создание/редактирование/удаление категорий
- ✅ Выбор иконок (30+ эмодзи)
- ✅ Выбор цветов (8 предустановленных)
- ✅ Drag & drop для сортировки (web)
- ✅ Подсчет количества заготовок

### Заготовки
- ✅ Добавление заготовок со всеми полями:
  - Название
  - Количество упаковок
  - Количество штук
  - Номер полки
  - Дата заморозки
  - Срок годности
  - Заметки (опционально)
  - Фото (опционально в web)
- ✅ Быстрое изменение количества (+/- кнопки)
- ✅ Индикатор срока годности (свежее/истекает/просрочено)
- ✅ Поиск по названию и заметкам
- ✅ Фильтрация по полке
- ✅ Редактирование/удаление (свайп в iOS)

## 🏗️ Архитектура

### Web (React)
```
src/
├── components/          # React компоненты
│   ├── CategoryList.tsx
│   ├── CategoryCard.tsx
│   ├── CategoryModal.tsx
│   ├── ItemList.tsx
│   ├── ItemRow.tsx
│   ├── ItemForm.tsx
│   └── ui/             # Radix UI компоненты
├── styles/
│   └── globals.css     # Tailwind CSS
└── App.tsx             # Главный компонент
```

**Технологии:**
- React 18 + TypeScript
- Vite (сборка)
- Tailwind CSS + Radix UI
- localStorage для хранения

### iOS (SwiftUI)
```
FreezerApp/
├── App/
│   └── FreezerApp.swift
├── Core/
│   ├── Models/         # Category, Item
│   └── Repository/     # DataRepository (UserDefaults)
├── Features/
│   ├── Categories/
│   │   └── Views/
│   └── Items/
│       └── Views/
└── UI/
    ├── Components/     # Переиспользуемые компоненты
    └── Theme/          # Цвета, шрифты, стили
```

**Технологии:**
- SwiftUI (iOS 16+)
- UserDefaults для хранения
- Codable для сериализации
- @StateObject / @EnvironmentObject

## 📦 Что включено

### Web версия (текущая директория)
- ✅ Полностью рабочее приложение
- ✅ Адаптивный дизайн (mobile-first)
- ✅ Offline-режим (localStorage)
- ✅ PWA готовность

### iOS версия (`ios-app/`)
- ✅ Нативное SwiftUI приложение
- ✅ Все функции из спецификации
- ✅ iOS-style навигация и UI
- ✅ Локальное хранение (UserDefaults)
- ✅ Готово к запуску в Xcode

## 🎨 Дизайн

Дизайн вдохновлен iOS Human Interface Guidelines:
- Минималистичный и чистый UI
- Мягкая цветовая палитра
- Удобная типографика
- Интуитивная навигация

Исходный дизайн: [Figma](https://www.figma.com/design/ldv0VwJxMG8DfRvIIskA9z/Frozen-Food-Inventory-App)

## 🔮 Roadmap (Phase 2)

- [ ] Backend (NestJS + PostgreSQL + Prisma)
- [ ] JWT аутентификация
- [ ] Синхронизация между устройствами
- [ ] Push-уведомления об истечении срока
- [ ] Загрузка фото на S3
- [ ] Android native app
- [ ] Telegram Mini-App
- [ ] Apple Watch app
- [ ] Экспорт/импорт данных

## 📄 Лицензия

MIT License

## 👨‍💻 Разработка

```bash
# Web
npm run dev        # Разработка
npm run build      # Сборка
npm run preview    # Просмотр production build

# iOS
# Откройте проект в Xcode и нажмите Cmd+R
```

## 📖 Документация

- [Web App README](README.md) - этот файл
- [iOS App README](ios-app/README.md) - документация iOS
- [iOS Setup Guide](ios-app/SETUP_GUIDE.md) - инструкция по настройке

## 🆘 Помощь

### Web
- Проблемы с запуском: проверьте версию Node.js (требуется 18+)
- Очистка кэша: удалите `node_modules` и запустите `npm install`

### iOS
- Проблемы с Xcode: см. [SETUP_GUIDE.md](ios-app/SETUP_GUIDE.md)
- Требуется macOS + Xcode 15+
- Минимум iOS 16.0

---

**Приятного использования! 🧊**
