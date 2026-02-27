import Foundation

enum HistoryEventType: String, Codable, Hashable {
    case itemAdded = "item_added"
    case itemUpdated = "item_updated"
    case itemDeleted = "item_deleted"
    case packagesChanged = "packages_changed"
    case itemsChanged = "items_changed"
}

struct HistoryEvent: Identifiable, Codable, Hashable {
    let id: String
    var type: HistoryEventType
    var itemId: String?
    var categoryId: String?
    var itemName: String
    var packagesDelta: Int?
    var itemsDelta: Int?
    var timestamp: Date

    // MARK: - Sync Fields
    var updatedAt: Date
    var deletedAt: Date?

    init(
        id: String = UUID().uuidString,
        type: HistoryEventType,
        itemId: String? = nil,
        categoryId: String? = nil,
        itemName: String,
        packagesDelta: Int? = nil,
        itemsDelta: Int? = nil,
        timestamp: Date = Date(),
        updatedAt: Date = Date(),
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.type = type
        self.itemId = itemId
        self.categoryId = categoryId
        self.itemName = itemName
        self.packagesDelta = packagesDelta
        self.itemsDelta = itemsDelta
        self.timestamp = timestamp
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }
}

// MARK: - Helper Methods
extension HistoryEvent {
    var displayText: String {
        switch type {
        case .itemAdded:
            return "Добавлено: \(itemName)"
        case .itemUpdated:
            return "Обновлено: \(itemName)"
        case .itemDeleted:
            return "Удалено: \(itemName)"
        case .packagesChanged:
            let delta = packagesDelta ?? 0
            let sign = delta > 0 ? "+" : ""
            return "\(itemName): \(sign)\(delta) упаковок"
        case .itemsChanged:
            let delta = itemsDelta ?? 0
            let sign = delta > 0 ? "+" : ""
            return "\(itemName): \(sign)\(delta) штук"
        }
    }
}
