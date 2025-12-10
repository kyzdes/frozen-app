import Foundation

struct Pair: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var serverVersion: Int64
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String,
        name: String,
        serverVersion: Int64 = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.serverVersion = serverVersion
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
