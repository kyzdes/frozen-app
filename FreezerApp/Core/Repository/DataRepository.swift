import Foundation
import Combine
import OSLog

class DataRepository: ObservableObject {
    @Published var categories: [Category] = []
    @Published var items: [Item] = []
    @Published var history: [HistoryEvent] = []

    private let categoriesKey = "freezer-categories"
    private let itemsKey = "freezer-items"
    private let historyKey = "freezer-history"
    private let notificationService = NotificationService.shared
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "DataRepository")

    // iCloud Key-Value Store для синхронизации между устройствами
    private let cloudStore = NSUbiquitousKeyValueStore.default

    init() {
        setupCloudSync()
        loadData()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - iCloud Sync Setup
    private func setupCloudSync() {
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
        // Пробуем загрузить из iCloud
        if let data = cloudStore.data(forKey: categoriesKey),
           let decoded = try? JSONDecoder().decode([Category].self, from: data) {
            categories = decoded
            return
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
        cloudStore.set(encoded, forKey: categoriesKey)
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: categoriesKey)
        // Запускаем синхронизацию
        cloudStore.synchronize()
        logger.info("Saved \(self.categories.count) categories")
    }

    private func loadItems() {
        // Пробуем загрузить из iCloud
        if let data = cloudStore.data(forKey: itemsKey),
           let decoded = try? JSONDecoder().decode([Item].self, from: data) {
            items = decoded
            return
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
        cloudStore.set(encoded, forKey: itemsKey)
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: itemsKey)
        // Запускаем синхронизацию
        cloudStore.synchronize()
        logger.info("Saved \(self.items.count) items")
    }

    private func loadHistory() {
        if let data = cloudStore.data(forKey: historyKey),
           let decoded = try? JSONDecoder().decode([HistoryEvent].self, from: data) {
            history = decoded
            return
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
        cloudStore.set(encoded, forKey: historyKey)
        UserDefaults.standard.set(encoded, forKey: historyKey)
        cloudStore.synchronize()
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
        categories.append(newCategory)
        saveCategories()
    }

    func updateCategory(_ category: Category) {
        guard let index = categories.firstIndex(where: { $0.id == category.id }) else { return }
        categories[index] = category
        saveCategories()
    }

    func deleteCategory(_ categoryId: String) {
        categories.removeAll { $0.id == categoryId }
        items.removeAll { $0.categoryId == categoryId }
        saveCategories()
        saveItems()
    }

    func reorderCategories(_ newCategories: [Category]) {
        var categoriesWithOrder = newCategories
        for index in categoriesWithOrder.indices {
            categoriesWithOrder[index].sortOrder = index
        }
        categories = categoriesWithOrder
        saveCategories()
    }

    // MARK: - Item Operations
    func addItem(_ item: Item) {
        items.append(item)
        saveItems()
        updateCategoryCounts()
        scheduleNotifications()
        addHistoryEvent(.itemAdded(item: item))
    }

    func updateItem(_ item: Item) {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        items[index] = item
        saveItems()
        updateCategoryCounts()
        scheduleNotifications()
    }

    func deleteItem(_ itemId: String) {
        notificationService.cancelNotifications(for: itemId)
        items.removeAll { $0.id == itemId }
        saveItems()
        updateCategoryCounts()
    }

    func updateItemPackagesCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        let oldValue = items[index].packagesCount
        items[index].packagesCount = max(0, items[index].packagesCount + delta)
        let newValue = items[index].packagesCount
        saveItems()
        addHistoryEvent(.quantityChanged(
            item: items[index],
            packagesDelta: newValue - oldValue,
            itemsDelta: nil,
            newPackages: newValue,
            newItems: items[index].itemsCount
        ))
    }

    func updateItemItemsCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        let oldValue = items[index].itemsCount
        items[index].itemsCount = max(0, items[index].itemsCount + delta)
        let newValue = items[index].itemsCount
        saveItems()
        addHistoryEvent(.quantityChanged(
            item: items[index],
            packagesDelta: nil,
            itemsDelta: newValue - oldValue,
            newPackages: items[index].packagesCount,
            newItems: newValue
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

    // MARK: - Notifications
    private func scheduleNotifications() {
        Task {
            await notificationService.scheduleNotifications(for: items)
        }
    }

    // MARK: - History
    private func addHistoryEvent(_ event: HistoryEvent) {
        history.append(event)
        // Ограничиваем размер журнала
        let limit = 500
        if history.count > limit {
            history = Array(history.suffix(limit))
        }
        saveHistory()
    }
}

// MARK: - History Events

enum HistoryEventType: String, Codable {
    case itemAdded
    case quantityChanged
}

struct HistoryEvent: Identifiable, Codable, Hashable {
    let id: String
    let type: HistoryEventType
    let itemId: String
    let categoryId: String
    let itemName: String
    let timestamp: Date
    let packagesDelta: Int?
    let itemsDelta: Int?
    let newPackages: Int?
    let newItems: Int?

    init(
        id: String = UUID().uuidString,
        type: HistoryEventType,
        itemId: String,
        categoryId: String,
        itemName: String,
        timestamp: Date = Date(),
        packagesDelta: Int? = nil,
        itemsDelta: Int? = nil,
        newPackages: Int? = nil,
        newItems: Int? = nil
    ) {
        self.id = id
        self.type = type
        self.itemId = itemId
        self.categoryId = categoryId
        self.itemName = itemName
        self.timestamp = timestamp
        self.packagesDelta = packagesDelta
        self.itemsDelta = itemsDelta
        self.newPackages = newPackages
        self.newItems = newItems
    }
}

extension HistoryEvent {
    static func itemAdded(item: Item) -> HistoryEvent {
        HistoryEvent(
            type: .itemAdded,
            itemId: item.id,
            categoryId: item.categoryId,
            itemName: item.name,
            packagesDelta: item.packagesCount,
            itemsDelta: item.itemsCount,
            newPackages: item.packagesCount,
            newItems: item.itemsCount
        )
    }

    static func quantityChanged(
        item: Item,
        packagesDelta: Int?,
        itemsDelta: Int?,
        newPackages: Int,
        newItems: Int
    ) -> HistoryEvent {
        HistoryEvent(
            type: .quantityChanged,
            itemId: item.id,
            categoryId: item.categoryId,
            itemName: item.name,
            packagesDelta: packagesDelta,
            itemsDelta: itemsDelta,
            newPackages: newPackages,
            newItems: newItems
        )
    }
}
