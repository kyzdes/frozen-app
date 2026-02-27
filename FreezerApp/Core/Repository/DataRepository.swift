import Foundation
import Combine
import OSLog

@MainActor
class DataRepository: ObservableObject {
    @Published var categories: [Category] = []
    @Published var items: [Item] = []
    @Published var history: [HistoryEvent] = []

    private let categoriesKey = "freezer-categories"
    private let itemsKey = "freezer-items"
    private let historyKey = "freezer-history"
    private let notificationService = NotificationService.shared
    private let syncService: SyncService
    private let analytics = AnalyticsService.shared
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "DataRepository")
    private let isICloudSyncActive = FeatureFlags.is_icloud_sync_active

    // iCloud Key-Value Store для локальной синхронизации (fallback)
    private let cloudStore = NSUbiquitousKeyValueStore.default
    private var cancellables = Set<AnyCancellable>()

    init(syncService: SyncService? = nil) {
        if let syncService = syncService {
            self.syncService = syncService
        } else {
            self.syncService = SyncService.shared
        }
        setupCloudSync()
        setupSyncHandlers()
        loadData()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - iCloud Sync Setup
    private func setupCloudSync() {
        guard isICloudSyncActive else { return }
        // Подписка на изменения из iCloud
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(cloudStoreDidChange),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: cloudStore
        )

        // Запуск синхронизации
        cloudStore.synchronize()
    }

    @objc private func cloudStoreDidChange(_ notification: Notification) {
        // Получаем изменения из iCloud и обновляем локальные данные
        DispatchQueue.main.async { [weak self] in
            self?.loadData()
        }
    }

    // MARK: - Sync Handlers
    private func setupSyncHandlers() {
        // Listen for initial data from server
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInitialData),
            name: .didReceiveInitialData,
            object: nil
        )

        // Listen for server changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleServerChanges),
            name: .didReceiveServerChanges,
            object: nil
        )

        // Listen for leave pair
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleLeavePair),
            name: .didLeavePair,
            object: nil
        )
    }

    @objc private func handleInitialData(_ notification: Notification) {
        guard let syncData = notification.userInfo?["data"] as? APIClient.SyncData else { return }
        DispatchQueue.main.async { [weak self] in
            self?.replaceAllData(
                categories: syncData.categories,
                items: syncData.items,
                history: syncData.history
            )
        }
    }

    @objc private func handleServerChanges(_ notification: Notification) {
        guard let syncData = notification.userInfo?["changes"] as? APIClient.SyncData else { return }
        DispatchQueue.main.async { [weak self] in
            self?.applyServerChanges(syncData)
        }
    }

    @objc private func handleLeavePair(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            // Keep local data after leaving shared pair (matches Settings UX copy).
            self?.updateCategoryCounts()
            self?.scheduleNotifications()
        }
    }

    private func applyServerChanges(_ syncData: APIClient.SyncData) {
        // Apply categories
        for serverCategory in syncData.categories {
            if serverCategory.deletedAt != nil {
                // Remove deleted
                categories.removeAll { $0.id == serverCategory.id }
            } else if let index = categories.firstIndex(where: { $0.id == serverCategory.id }) {
                // Update existing
                categories[index] = serverCategory
            } else {
                // Add new
                categories.append(serverCategory)
            }
        }

        // Apply items
        for serverItem in syncData.items {
            if serverItem.deletedAt != nil {
                // Remove deleted
                items.removeAll { $0.id == serverItem.id }
            } else if let index = items.firstIndex(where: { $0.id == serverItem.id }) {
                // Update existing
                items[index] = serverItem
            } else {
                // Add new
                items.append(serverItem)
            }
        }

        // Apply history
        for serverHistory in syncData.history {
            if serverHistory.deletedAt == nil,
               !history.contains(where: { $0.id == serverHistory.id }) {
                history.append(serverHistory)
            }
        }

        saveCategories()
        saveItems()
        saveHistory()
        updateCategoryCounts()
        scheduleNotifications()
    }

    // MARK: - Load & Save
    private func loadData() {
        loadCategories()
        loadItems()
        loadHistory()

        // Initialize with sample data if empty
        if categories.isEmpty {
            categories = [
                Category(name: "Овощи", icon: "🥬", color: "#34C759", sortOrder: 0),
                Category(name: "Мясо", icon: "🍖", color: "#FF3B30", sortOrder: 1),
                Category(name: "Ягоды", icon: "🫐", color: "#AF52DE", sortOrder: 2)
            ]
            saveCategories()
        }

        updateCategoryCounts()
    }

    private func loadCategories() {
        if isICloudSyncActive {
            // Пробуем загрузить из iCloud
            if let data = cloudStore.data(forKey: categoriesKey),
               let decoded = try? JSONDecoder().decode([Category].self, from: data) {
                categories = decoded
                return
            }
        }

        // Фолбэк на локальное хранилище (для миграции старых данных)
        if let data = UserDefaults.standard.data(forKey: categoriesKey),
           let decoded = try? JSONDecoder().decode([Category].self, from: data) {
            categories = decoded
            // Сохраняем в iCloud для миграции
            saveCategories()
            return
        }
    }

    private func saveCategories() {
        guard let encoded = try? JSONEncoder().encode(categories) else {
            logger.error("Failed to encode categories")
            return
        }
        // Сохраняем в iCloud
        if isICloudSyncActive {
            cloudStore.set(encoded, forKey: categoriesKey)
            // Запускаем синхронизацию
            cloudStore.synchronize()
        }
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: categoriesKey)
        logger.info("Saved \(self.categories.count) categories")
    }

    private func loadItems() {
        if isICloudSyncActive {
            // Пробуем загрузить из iCloud
            if let data = cloudStore.data(forKey: itemsKey),
               let decoded = try? JSONDecoder().decode([Item].self, from: data) {
                items = decoded
                return
            }
        }

        // Фолбэк на локальное хранилище (для миграции старых данных)
        if let data = UserDefaults.standard.data(forKey: itemsKey),
           let decoded = try? JSONDecoder().decode([Item].self, from: data) {
            items = decoded
            // Сохраняем в iCloud для миграции
            saveItems()
            return
        }
    }

    private func saveItems() {
        guard let encoded = try? JSONEncoder().encode(items) else {
            logger.error("Failed to encode items")
            return
        }
        // Сохраняем в iCloud
        if isICloudSyncActive {
            cloudStore.set(encoded, forKey: itemsKey)
            // Запускаем синхронизацию
            cloudStore.synchronize()
        }
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: itemsKey)
        logger.info("Saved \(self.items.count) items")
    }

    private func loadHistory() {
        if isICloudSyncActive {
            if let data = cloudStore.data(forKey: historyKey),
               let decoded = try? JSONDecoder().decode([HistoryEvent].self, from: data) {
                history = decoded
                return
            }
        }

        if let data = UserDefaults.standard.data(forKey: historyKey),
           let decoded = try? JSONDecoder().decode([HistoryEvent].self, from: data) {
            history = decoded
            saveHistory()
        }
    }

    private func saveHistory() {
        guard let encoded = try? JSONEncoder().encode(history) else {
            logger.error("Failed to encode history")
            return
        }
        if isICloudSyncActive {
            cloudStore.set(encoded, forKey: historyKey)
            cloudStore.synchronize()
        }
        UserDefaults.standard.set(encoded, forKey: historyKey)
        logger.info("Saved \(self.history.count) history events")
    }

    private func updateCategoryCounts() {
        for index in categories.indices {
            let count = items.filter { $0.categoryId == categories[index].id }.count
            categories[index].itemCount = count
        }
        saveCategories()
    }

    // MARK: - Category Operations
    func addCategory(_ category: Category) {
        var newCategory = category
        newCategory.sortOrder = categories.count
        newCategory.updatedAt = Date()
        categories.append(newCategory)
        saveCategories()
        analytics.trackCategoryCreated(name: newCategory.name, icon: newCategory.icon)

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .categoryAdded,
            entityId: newCategory.id,
            timestamp: Date(),
            category: newCategory,
            item: nil,
            historyEvent: nil
        ))
    }

    func updateCategory(_ category: Category) {
        guard let index = categories.firstIndex(where: { $0.id == category.id }) else { return }
        var updatedCategory = category
        updatedCategory.updatedAt = Date()
        categories[index] = updatedCategory
        saveCategories()

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .categoryUpdated,
            entityId: category.id,
            timestamp: Date(),
            category: updatedCategory,
            item: nil,
            historyEvent: nil
        ))
    }

    func deleteCategory(_ categoryId: String) {
        // Soft delete for sync
        if let index = categories.firstIndex(where: { $0.id == categoryId }) {
            categories[index].deletedAt = Date()
            categories[index].updatedAt = Date()

            // Also soft delete items in this category
            for itemIndex in items.indices where items[itemIndex].categoryId == categoryId {
                items[itemIndex].deletedAt = Date()
                items[itemIndex].updatedAt = Date()
            }
            let deletedItems = items.filter { $0.categoryId == categoryId }

            saveCategories()
            saveItems()

            // Queue for sync
            syncService.queueChange(PendingChange(
                type: .categoryDeleted,
                entityId: categoryId,
                timestamp: Date(),
                category: categories[index],
                item: nil,
                historyEvent: nil
            ))
            for deletedItem in deletedItems {
                syncService.queueChange(PendingChange(
                    type: .itemDeleted,
                    entityId: deletedItem.id,
                    timestamp: Date(),
                    category: nil,
                    item: deletedItem,
                    historyEvent: nil
                ))
            }

            // Remove from local display after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
                self?.categories.removeAll { $0.id == categoryId }
                self?.items.removeAll { $0.categoryId == categoryId }
                self?.updateCategoryCounts()
            }
        }
    }

    func reorderCategories(_ newCategories: [Category]) {
        var categoriesWithOrder = newCategories
        for index in categoriesWithOrder.indices {
            categoriesWithOrder[index].sortOrder = index
            categoriesWithOrder[index].updatedAt = Date()
        }
        categories = categoriesWithOrder
        saveCategories()

        // Queue all categories for sync
        for category in categoriesWithOrder {
            syncService.queueChange(PendingChange(
                type: .categoryUpdated,
                entityId: category.id,
                timestamp: Date(),
                category: category,
                item: nil,
                historyEvent: nil
            ))
        }
    }

    // MARK: - Item Operations
    func addItem(_ item: Item) {
        var newItem = item
        newItem.updatedAt = Date()
        items.append(newItem)
        saveItems()
        updateCategoryCounts()
        scheduleNotifications()
        analytics.trackItemCreated(name: newItem.name, categoryId: newItem.categoryId, shelfNumber: newItem.shelfNumber)

        // Add history event
        let historyEvent = HistoryEvent(
            type: .itemAdded,
            itemId: newItem.id,
            categoryId: newItem.categoryId,
            itemName: newItem.name,
            packagesDelta: newItem.packagesCount,
            itemsDelta: newItem.itemsCount
        )
        addHistoryEvent(historyEvent)

        // Queue for sync
            syncService.queueChange(PendingChange(
                type: .itemAdded,
                entityId: newItem.id,
                timestamp: Date(),
                category: nil,
                item: newItem,
                historyEvent: nil
            ))
    }

    func updateItem(_ item: Item) {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        var updatedItem = item
        updatedItem.updatedAt = Date()
        items[index] = updatedItem
        saveItems()
        updateCategoryCounts()
        scheduleNotifications()

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .itemUpdated,
            entityId: item.id,
            timestamp: Date(),
            category: nil,
            item: updatedItem,
            historyEvent: nil
        ))
    }

    func deleteItem(_ itemId: String) {
        notificationService.cancelNotifications(for: itemId)

        // Soft delete for sync
        if let index = items.firstIndex(where: { $0.id == itemId }) {
            items[index].deletedAt = Date()
            items[index].updatedAt = Date()
            saveItems()

            // Queue for sync
            syncService.queueChange(PendingChange(
                type: .itemDeleted,
                entityId: itemId,
                timestamp: Date(),
                category: nil,
                item: items[index],
                historyEvent: nil
            ))

            // Remove from local display after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
                self?.items.removeAll { $0.id == itemId }
                self?.updateCategoryCounts()
            }
        }
    }

    func updateItemPackagesCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        let oldValue = items[index].packagesCount
        items[index].packagesCount = max(0, items[index].packagesCount + delta)
        items[index].updatedAt = Date()
        let newValue = items[index].packagesCount
        saveItems()

        let historyEvent = HistoryEvent(
            type: .packagesChanged,
            itemId: items[index].id,
            categoryId: items[index].categoryId,
            itemName: items[index].name,
            packagesDelta: newValue - oldValue
        )
        addHistoryEvent(historyEvent)

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .itemUpdated,
            entityId: itemId,
            timestamp: Date(),
            category: nil,
            item: items[index],
            historyEvent: nil
        ))
    }

    func updateItemItemsCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        let oldValue = items[index].itemsCount
        items[index].itemsCount = max(0, items[index].itemsCount + delta)
        items[index].updatedAt = Date()
        let newValue = items[index].itemsCount
        saveItems()

        let historyEvent = HistoryEvent(
            type: .itemsChanged,
            itemId: items[index].id,
            categoryId: items[index].categoryId,
            itemName: items[index].name,
            itemsDelta: newValue - oldValue
        )
        addHistoryEvent(historyEvent)

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .itemUpdated,
            entityId: itemId,
            timestamp: Date(),
            category: nil,
            item: items[index],
            historyEvent: nil
        ))
    }

    func getItems(for categoryId: String) -> [Item] {
        items.filter { $0.categoryId == categoryId }
    }

    // MARK: - Data Import/Export
    func replaceAllData(categories: [Category], items: [Item], history: [HistoryEvent] = []) {
        self.categories = categories
        self.items = items
        self.history = history
        saveCategories()
        saveItems()
        saveHistory()
        updateCategoryCounts()
        scheduleNotifications()
    }

    // MARK: - Demo Data (Debug)
    #if DEBUG
    func addDemoData() {
        let demoCategories = [
            ("Демо мясо", "🍖", "#FF3B30"),
            ("Демо рыба", "🐟", "#5AC8FA"),
            ("Демо овощи", "🥦", "#34C759"),
            ("Демо ягоды", "🫐", "#AF52DE"),
            ("Демо готовое", "🥡", "#FF9500"),
            ("Демо десерты", "🍨", "#FF2D55"),
            ("Демо напитки", "🥤", "#007AFF"),
            ("Демо супы", "🍲", "#FF9F0A"),
            ("Демо тесто", "🥟", "#FFD60A")
        ]

        var createdCategoryIds: [String] = []
        for (name, icon, color) in demoCategories {
            let category = Category(name: name, icon: icon, color: color, sortOrder: categories.count)
            addCategory(category)
            createdCategoryIds.append(category.id)
        }

        let itemNames = [
            "Куриные бедра", "Говядина тушеная", "Филе лосося", "Креветки очищенные",
            "Брокколи", "Цветная капуста", "Черника", "Малина",
            "Пельмени домашние", "Лазанья", "Картофельное пюре", "Борщ",
            "Суп-пюре", "Смузи клубничный", "Мороженое ваниль", "Сорбет манго",
            "Булочки", "Пицца сырная", "Хинкали", "Мидии в соусе"
        ]

        for (index, name) in itemNames.enumerated() {
            let categoryIndex = index % createdCategoryIds.count
            guard categoryIndex < createdCategoryIds.count else { continue }
            let categoryId = createdCategoryIds[categoryIndex]
            let daysAgo = Int.random(in: 1...30)
            let shelf = (index % 4) + 1
            let freezeDate = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
            let expirationDate = Calendar.current.date(byAdding: .day, value: 60 - daysAgo, to: Date()) ?? Date()

            let item = Item(
                name: name,
                packagesCount: Int.random(in: 1...4),
                itemsCount: Int.random(in: 1...8),
                shelfNumber: shelf,
                freezeDate: freezeDate,
                expirationDate: expirationDate,
                notes: "Демо",
                categoryId: categoryId
            )
            addItem(item)
        }
    }
    #endif

    // MARK: - Notifications
    private func scheduleNotifications() {
        Task {
            await notificationService.scheduleNotifications(for: items)
        }
    }

    // MARK: - History
    private func addHistoryEvent(_ event: HistoryEvent) {
        var newEvent = event
        newEvent.updatedAt = Date()
        history.append(newEvent)

        // Ограничиваем размер журнала
        let limit = 500
        if history.count > limit {
            history = Array(history.suffix(limit))
        }
        saveHistory()

        // Queue for sync
        syncService.queueChange(PendingChange(
            type: .historyAdded,
            entityId: newEvent.id,
            timestamp: Date(),
            category: nil,
            item: nil,
            historyEvent: newEvent
        ))
    }
}
