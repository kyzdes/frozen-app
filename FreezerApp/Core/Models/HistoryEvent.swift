import Foundation

/// Entities that support soft deletion via `deletedAt`.
protocol SoftDeletable {
    var deletedAt: Date? { get }
}

enum HistoryEventType: String, Codable, Hashable {
    // Canonical snake_case raw values shared with backend/web (D-006). Do not change.
    case itemAdded = "item_added"
    case itemUpdated = "item_updated"
    case itemDeleted = "item_deleted"
    case packagesChanged = "packages_changed"
    case itemsChanged = "items_changed"
    /// Fallback for any unrecognized/legacy raw value coming from a newer server.
    /// Decodes here instead of throwing, so the event stays visible-but-benign
    /// rather than being silently dropped by LossyArray.
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        if let known = HistoryEventType(rawValue: raw) {
            self = known
        } else {
            #if DEBUG
            print("HistoryEventType: unrecognized raw value '\(raw)', decoding as .unknown")
            #endif
            self = .unknown
        }
    }
}

struct HistoryEvent: Identifiable, Codable, Hashable, SoftDeletable {
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

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case itemId
        case categoryId
        case itemName
        case packagesDelta
        case itemsDelta
        case timestamp
        case updatedAt
        case deletedAt
    }

    init(
        id: String = UUID().uuidString.lowercased(),
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

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        type = try c.decode(HistoryEventType.self, forKey: .type)
        itemId = try c.decodeIfPresent(String.self, forKey: .itemId)
        categoryId = try c.decodeIfPresent(String.self, forKey: .categoryId)
        itemName = try c.decode(String.self, forKey: .itemName)
        packagesDelta = try c.decodeIfPresent(Int.self, forKey: .packagesDelta)
        itemsDelta = try c.decodeIfPresent(Int.self, forKey: .itemsDelta)
        timestamp = try c.decode(Date.self, forKey: .timestamp)
        // The server may omit `updatedAt` (web DTO marks it optional); fall back
        // to `timestamp` so the whole event still decodes.
        updatedAt = (try? c.decode(Date.self, forKey: .updatedAt)) ?? timestamp
        deletedAt = try c.decodeIfPresent(Date.self, forKey: .deletedAt)
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
        case .unknown:
            return itemName
        }
    }
}

// MARK: - Lossy Array Decoding

/// Decodes an array element-by-element, silently skipping any element that
/// fails to decode (e.g. a malformed entry or an unknown future enum case).
/// A single bad element will not abort decoding of the whole batch.
struct LossyArray<Element: Decodable>: Decodable {
    let elements: [Element]

    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        var result: [Element] = []
        if let count = container.count {
            result.reserveCapacity(count)
        }
        // `LossyElement.init` never throws, so each `decode` consumes exactly
        // one element and advances the container, even when that element is
        // malformed or has an unknown enum case.
        while !container.isAtEnd {
            let wrapped = try container.decode(LossyElement<Element>.self)
            if let value = wrapped.value {
                result.append(value)
            }
        }
        elements = result
    }
}

/// Wraps a single element so a decode failure is captured as `nil` rather than
/// propagating and aborting the surrounding unkeyed container.
private struct LossyElement<Element: Decodable>: Decodable {
    let value: Element?

    init(from decoder: Decoder) throws {
        value = try? Element(from: decoder)
    }
}
