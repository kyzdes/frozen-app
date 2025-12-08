## О чём это приложение
- «Морозилка» — учёт домашних заготовок. Есть веб (React + Vite + Tailwind классы) и iOS (SwiftUI). Хранение локальное: web — `localStorage`, iOS — `NSUbiquitousKeyValueStore` с fallback в `UserDefaults`.

## Структура репозитория
- `src/` — веб-клиент: `App.tsx`, хуки/состояние + компоненты. `components/ui` — набор готовых UI-примитивов (Radix/Shadcn порт). `styles/globals.css` и `index.css` — Tailwind v4 темы/префлайт.
- `FreezerApp/` — iOS-клиент (Xcode проект): `App/` точка входа, `Core/` модели/репозиторий/сервисы, `Features/` экраны категорий, заготовок, настроек, `UI/` тема и переиспользуемые вью.
- Корень: `vite.config.ts`, `package.json`, `index.html`, `README.md`. Отсутствует `.gitignore` (в дереве есть разрозненные .DS_Store).

## Веб-приложение (src/)
- Главный поток: `App.tsx` управляет экраном (`home`/`category`/`item-form`), массивами `categories` и `items`, выбранной категорией/заготовкой и модалкой категорий.
- Модели:
  - `Category { id, name, icon?, color?, itemCount, sortOrder? }`
  - `Item { id, name, packages, items, shelf, freezeDate, expirationDate, notes?, photo?, categoryId }`
- Хранение:
  - `localStorage` ключи `freezer-categories`, `freezer-items`.
  - При отсутствии данных создаются 3 категории (Овощи/Мясо/Ягоды).
  - При изменении `items` пересчитывается `itemCount` по категориям.
- Основные компоненты:
  - `CategoryList` — дэшборд: счётчики, drag&drop сортировка, выбор/удаление/редактирование категорий, FAB `+`.
  - `CategoryCard` — свайп на touch для действий, drag handle, подсчёт заготовок.
  - `CategoryModal` — модалка создания/редактирования, набор предустановленных иконок/цветов.
  - `ItemList` — список по категории: поиск, фильтр по полке, состояния пустого/нет результатов, FAB `+`.
  - `ItemRow` — карточка заготовки с быстрым изменением `packages`, индикаторы срока (свежее/скоро/просрочено), свайп для edit/delete.
  - `ItemForm` — форма создания/редактирования; требует `name` + `expirationDate`, опционально фото (FileReader -> data URL).
- Стили/UX: Mobile-first, iOS-подобные цвета (`#5B9FD3` основной), анимация `slide-up` для модалок. Tailwind классы из сгенерированного `index.css` + темы в `styles/globals.css`.
- Сборка/скрипты: `npm run dev` (порт 3000 в `vite.config.ts`, open=true), `npm run build` (`build/`), Vite + React SWC. TypeScript подключен через `@vitejs/plugin-react-swc`.

## iOS (FreezerApp/)
- Точка входа: `App/FreezerApp.swift` — создаёт `DataRepository` как `@StateObject` и инжектит в `CategoryListView`.
- Модели: `Category` (`id`, `name`, `icon?`, `color?`, `itemCount`, `sortOrder?`); `Item` (`id`, `name`, `packagesCount`, `itemsCount`, `shelfNumber`, `freezeDate`, `expirationDate`, `notes?`, `photoUrl?`, `categoryId`) с вычисляемыми `daysUntilExpiration`, `isExpired`, `isExpiringSoon`.
- `DataRepository`:
  - Хранение в `NSUbiquitousKeyValueStore` (ключи `freezer-categories`, `freezer-items`) + локальный fallback в `UserDefaults`.
  - Инициализирует примерные категории при пустом хранилище, пересчитывает `itemCount`.
  - Операции: add/update/delete/reorder категорий; add/update/delete items; обновление количеств; импорт/замена всех данных; получение items по `categoryId`.
  - При изменениях планирует уведомления (через `NotificationService`).
- Сервисы:
  - `NotificationService` — запрос разрешений, планирование уведомлений за `notificationDays` (UserDefaults-backed, default `[3,7,14]`), управление badge, cancel всех или по itemId. Делегат UNUserNotificationCenter.
  - `BackupService` — экспорт/импорт JSON (`BackupData` v1.0), валидация (дубликаты ID, осиротевшие items), создание временного файла. Расширяет `UTType.freezerBackup`.
  - `AnalyticsService` — логирование событий (пока через `Logger/print`, без внешней интеграции).
- UI/Тема: `UI/Theme/Theme.swift` задаёт цветовую схему (светлая/тёмная), типографику и отступы; расширения `Color/UIColor`.
- Экраны:
  - `CategoryListView` — список категорий с разворотом товаров, drag-reorder (EditMode), поиск по items, фильтр по полке, переход в `ItemListView`, модалки создания/редактирования категорий и items, кнопка настроек.
  - `CategoryFormView` — форма категории, выбор иконки/цвета из `Theme.preset*`, предпросмотр, удаление категории.
  - `ItemListView` — список items внутри категории, поиск/фильтр по полке, кнопка `+`, empty state.
  - `ItemFormView` — форма item с степперами количеств и полки, date pickers, notes, удаление при редактировании.
  - `SettingsView` — экспорт/импорт (file exporter/importer), выбор темы (system/light/dark via @AppStorage `appearanceMode`), переключатель уведомлений + выбор дней, статус iCloud, статистика данных, версия приложения, ссылка на сайт.

## Замечания/полезное
- Текущая Git-ветка: `ver-0.5` (есть локальные .DS_Store и `FreezerApp.xcodeproj/...UserInterfaceState.xcuserstate` в незакоммиченном состоянии).
- Нет `.gitignore`; следи, чтобы не закоммитить временные macOS/Xcode файлы.
- Референсные ключи хранилища: `freezer-categories`, `freezer-items`, `notificationsEnabled`, `notificationDaysData` (iOS), `appearanceMode`.
- Начальные данные (web/iOS) идентичные 3 категории, что помогает быстро поднять UI без ввода.
- История по iOS UI (главный экран категорий): ItemRow в компактном режиме без свайпов, без нижних кнопок и без summary-строки; показывается только полка (бейдж) и счетчики `+/-`. Свайпы включаются только в детальном списке (`ItemListView`). Для корректной работы `+/-` внутри `List` используется `.buttonStyle(.borderless)` на кнопках.

## Быстрый старт / сборка
- Web: `npm install` → `npm run dev` (http://localhost:3000) → `npm run build` (в `build/`).
- iOS: открыть `FreezerApp/FreezerApp.xcodeproj` в Xcode 15+, запуск `Cmd+R`. Сервисы уведомлений/iCloud требуют реального устройства/учётки.
