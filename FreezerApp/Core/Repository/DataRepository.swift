import Foundation
import Combine

class DataRepository: ObservableObject {
    @Published var categories: [Category] = []
    @Published var items: [Item] = []

    private let categoriesKey = "freezer-categories"
    private let itemsKey = "freezer-items"
    private let notificationService = NotificationService.shared

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
        guard let encoded = try? JSONEncoder().encode(categories) else { return }
        // Сохраняем в iCloud
        cloudStore.set(encoded, forKey: categoriesKey)
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: categoriesKey)
        // Запускаем синхронизацию
        cloudStore.synchronize()
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
        guard let encoded = try? JSONEncoder().encode(items) else { return }
        // Сохраняем в iCloud
        cloudStore.set(encoded, forKey: itemsKey)
        // Также сохраняем локально как резервную копию
        UserDefaults.standard.set(encoded, forKey: itemsKey)
        // Запускаем синхронизацию
        cloudStore.synchronize()
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

    func updateItemQuantity(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        items[index].packagesCount = max(0, items[index].packagesCount + delta)
        saveItems()
    }

    func updateItemPackagesCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        items[index].packagesCount = max(0, items[index].packagesCount + delta)
        saveItems()
    }

    func updateItemItemsCount(_ itemId: String, delta: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        items[index].itemsCount = max(0, items[index].itemsCount + delta)
        saveItems()
    }

    func getItems(for categoryId: String) -> [Item] {
        items.filter { $0.categoryId == categoryId }
    }

    // MARK: - Data Import/Export
    func replaceAllData(categories: [Category], items: [Item]) {
        self.categories = categories
        self.items = items
        saveCategories()
        saveItems()
        updateCategoryCounts()
        scheduleNotifications()
    }

    // MARK: - Notifications
    private func scheduleNotifications() {
        Task {
            await notificationService.scheduleNotifications(for: items)
        }
    }
}
