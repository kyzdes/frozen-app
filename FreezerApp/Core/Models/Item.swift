import Foundation

struct Item: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var packagesCount: Int
    var itemsCount: Int
    var shelfNumber: Int
    var freezeDate: Date
    var expirationDate: Date
    var notes: String?
    var photoUrl: String?
    var categoryId: String

    init(
        id: String = UUID().uuidString,
        name: String,
        packagesCount: Int = 1,
        itemsCount: Int = 1,
        shelfNumber: Int = 1,
        freezeDate: Date = Date(),
        expirationDate: Date,
        notes: String? = nil,
        photoUrl: String? = nil,
        categoryId: String
    ) {
        self.id = id
        self.name = name
        self.packagesCount = packagesCount
        self.itemsCount = itemsCount
        self.shelfNumber = shelfNumber
        self.freezeDate = freezeDate
        self.expirationDate = expirationDate
        self.notes = notes
        self.photoUrl = photoUrl
        self.categoryId = categoryId
    }

    var daysUntilExpiration: Int {
        Calendar.current.dateComponents([.day], from: Date(), to: expirationDate).day ?? 0
    }

    var isExpired: Bool {
        daysUntilExpiration < 0
    }

    var isExpiringSoon: Bool {
        daysUntilExpiration >= 0 && daysUntilExpiration <= 30
    }
}

// MARK: - Sample Data
extension Item {
    static func sampleItems(for categoryId: String) -> [Item] {
        let calendar = Calendar.current
        let today = Date()

        return [
            Item(
                name: "Куриный бульон",
                packagesCount: 2,
                itemsCount: 5,
                shelfNumber: 3,
                freezeDate: calendar.date(byAdding: .month, value: -1, to: today)!,
                expirationDate: calendar.date(byAdding: .month, value: 6, to: today)!,
                notes: "Из домашней курицы",
                categoryId: categoryId
            ),
            Item(
                name: "Говяжий бульон",
                packagesCount: 1,
                itemsCount: 3,
                shelfNumber: 2,
                freezeDate: calendar.date(byAdding: .day, value: -15, to: today)!,
                expirationDate: calendar.date(byAdding: .month, value: 5, to: today)!,
                categoryId: categoryId
            )
        ]
    }
}
