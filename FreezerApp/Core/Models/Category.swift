import Foundation

struct Category: Identifiable, Codable, Hashable, SoftDeletable {
    let id: String
    var name: String
    var icon: String?
    var color: String?
    var itemCount: Int
    var sortOrder: Int?

    // MARK: - Sync Fields
    var updatedAt: Date
    var deletedAt: Date?

    init(
        id: String = UUID().uuidString.lowercased(),
        name: String,
        icon: String? = nil,
        color: String? = nil,
        itemCount: Int = 0,
        sortOrder: Int? = nil,
        updatedAt: Date = Date(),
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.itemCount = itemCount
        self.sortOrder = sortOrder
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }
}

// MARK: - Sample Data
extension Category {
    static let sampleCategories = [
        Category(name: "Овощи", icon: "🥬", color: "#34C759", itemCount: 12, sortOrder: 0),
        Category(name: "Мясо", icon: "🍖", color: "#FF3B30", itemCount: 8, sortOrder: 1),
        Category(name: "Ягоды", icon: "🫐", color: "#AF52DE", itemCount: 5, sortOrder: 2),
        Category(name: "Бульоны", icon: "🥣", color: "#5B9FD3", itemCount: 3, sortOrder: 3)
    ]
}
