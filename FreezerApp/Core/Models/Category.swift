import Foundation

struct Category: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var icon: String?
    var color: String?
    var itemCount: Int
    var sortOrder: Int?

    init(
        id: String = UUID().uuidString,
        name: String,
        icon: String? = nil,
        color: String? = nil,
        itemCount: Int = 0,
        sortOrder: Int? = nil
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.itemCount = itemCount
        self.sortOrder = sortOrder
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
