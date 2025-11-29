# Пошаговая инструкция по настройке iOS проекта

## Метод 1: Создание нового Xcode проекта

### 1. Создайте новый проект в Xcode

```
1. Откройте Xcode
2. File → New → Project
3. Выберите "iOS" вверху и "App" в списке шаблонов
4. Нажмите "Next"
```

### 2. Настройте параметры проекта

```
Product Name: FreezerApp
Team: [Выберите ваш Apple Developer аккаунт или оставьте пустым]
Organization Identifier: com.yourcompany
Interface: SwiftUI
Language: Swift
Storage: None
Include Tests: ✓ (опционально)
```

Нажмите "Next" и сохраните проект в любую удобную папку.

### 3. Настройте структуру проекта

После создания проекта Xcode создаст базовую структуру. Теперь:

1. **Удалите автоматически созданные файлы:**
   - Выберите `ContentView.swift`
   - Нажмите Delete → Move to Trash

2. **Создайте группы (папки) в проекте:**
   - Кликните правой кнопкой на "FreezerApp" в навигаторе
   - New Group → назовите "App"
   - Повторите для групп: "Core", "Features", "UI", "Resources"

3. **Создайте подгруппы:**
   ```
   Core/
   ├── Models/
   ├── Services/
   └── Repository/

   Features/
   ├── Categories/
   │   ├── Views/
   │   └── ViewModels/
   └── Items/
       ├── Views/
       └── ViewModels/

   UI/
   ├── Components/
   └── Theme/
   ```

### 4. Добавьте файлы из нашей структуры

#### Вариант A: Перетаскиванием

1. Откройте Finder с папкой `ios-app/FreezerApp`
2. Перетащите файлы из соответствующих папок в Xcode
3. При добавлении выберите:
   - ✓ Copy items if needed
   - ✓ Create groups
   - ✓ Add to targets: FreezerApp

#### Вариант B: Через меню

1. Для каждой группы:
   - Кликните правой кнопкой на группу
   - Add Files to "FreezerApp"
   - Выберите соответствующие файлы
   - Нажмите Add

### 5. Убедитесь, что все файлы добавлены

Проверьте, что в проекте есть все следующие файлы:

```
✓ App/FreezerApp.swift
✓ Core/Models/Category.swift
✓ Core/Models/Item.swift
✓ Core/Repository/DataRepository.swift
✓ Features/Categories/Views/CategoryListView.swift
✓ Features/Categories/Views/CategoryFormView.swift
✓ Features/Items/Views/ItemListView.swift
✓ Features/Items/Views/ItemFormView.swift
✓ UI/Components/CategoryCard.swift
✓ UI/Components/ItemRow.swift
✓ UI/Theme/Theme.swift
```

### 6. Проверьте настройки проекта

1. Выберите проект в навигаторе (самый верхний элемент)
2. Выберите таргет "FreezerApp"
3. Во вкладке "General":
   - **Display Name**: Морозилка
   - **Bundle Identifier**: com.yourcompany.freezerapp
   - **Minimum Deployments**: iOS 16.0

### 7. Запустите приложение

1. Выберите симулятор (например, iPhone 15 Pro)
2. Нажмите **Cmd+R** или кнопку ▶️
3. Дождитесь сборки и запуска

## Метод 2: Импорт готового проекта через Xcode Package

Если Xcode не открывает проект автоматически:

1. File → Open
2. Выберите папку `ios-app`
3. Найдите файл `FreezerApp.xcodeproj` (после создания проекта)
4. Откройте его

## Решение типичных проблем

### Проблема: "No such module 'SwiftUI'"

**Решение:** Убедитесь, что:
- Xcode версии 15.0 или новее
- Deployment Target установлен на iOS 16.0+

### Проблема: Ошибки компиляции в Theme.swift

**Решение:** Убедитесь, что файл `Theme.swift` добавлен в таргет:
1. Выберите Theme.swift
2. В инспекторе справа проверьте Target Membership
3. Убедитесь, что отмечен FreezerApp

### Проблема: "Cannot find type 'Category' in scope"

**Решение:** Убедитесь, что все файлы из `Core/Models/` добавлены в проект.

### Проблема: Приложение не запускается на симуляторе

**Решение:**
1. Product → Clean Build Folder (Cmd+Shift+K)
2. Перезапустите Xcode
3. Product → Build (Cmd+B)
4. Запустите снова (Cmd+R)

## Запуск на реальном устройстве

### 1. Подключите iPhone

1. Подключите iPhone к Mac через USB
2. Разблокируйте iPhone
3. Если появится запрос "Trust This Computer?" - нажмите "Trust"

### 2. Настройте подпись кода

1. В Xcode выберите проект → FreezerApp target
2. Во вкладке "Signing & Capabilities":
   - Выберите ваш Team
   - Xcode автоматически создаст provisioning profile

### 3. Выберите устройство и запустите

1. В меню устройств вверху выберите ваш iPhone
2. Нажмите Cmd+R
3. При первом запуске на iPhone:
   - Откройте Настройки → Основные → VPN и управление устройством
   - Выберите ваш Developer App
   - Нажмите "Доверять"
4. Запустите приложение снова

## Структура файлов проекта

После настройки ваш проект должен выглядеть так:

```
FreezerApp.xcodeproj/
FreezerApp/
├── App/
│   └── FreezerApp.swift
├── Core/
│   ├── Models/
│   │   ├── Category.swift
│   │   └── Item.swift
│   ├── Services/
│   └── Repository/
│       └── DataRepository.swift
├── Features/
│   ├── Categories/
│   │   └── Views/
│   │       ├── CategoryListView.swift
│   │       └── CategoryFormView.swift
│   └── Items/
│       └── Views/
│           ├── ItemListView.swift
│           └── ItemFormView.swift
├── UI/
│   ├── Components/
│   │   ├── CategoryCard.swift
│   │   └── ItemRow.swift
│   └── Theme/
│       └── Theme.swift
├── Resources/
└── Assets.xcassets/
```

## Дополнительные ресурсы

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Xcode User Guide](https://developer.apple.com/library/archive/documentation/ToolsLanguages/Conceptual/Xcode_Overview/)

## Получение помощи

Если возникли проблемы:
1. Проверьте, что все файлы добавлены в проект
2. Убедитесь, что Deployment Target = iOS 16.0
3. Попробуйте Clean Build Folder (Cmd+Shift+K)
4. Перезапустите Xcode

Удачи с разработкой! 🚀
