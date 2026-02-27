import Foundation
import Security

enum KeychainError: Error {
    case itemNotFound
    case unexpectedData
    case unhandledError(status: OSStatus)
}

class KeychainService {
    static let shared = KeychainService()

    private init() {}

    // MARK: - Keys
    private enum Keys {
        static let deviceId = "com.freezerapp.deviceId"
        static let accessToken = "com.freezerapp.accessToken"
        static let refreshToken = "com.freezerapp.refreshToken"
        static let pairId = "com.freezerapp.pairId"
        static let userId = "com.freezerapp.userId"
    }

    // MARK: - Public API
    var deviceId: String {
        get {
            if let existing = try? getString(forKey: Keys.deviceId) {
                return existing
            }
            let newId = UUID().uuidString
            try? saveString(newId, forKey: Keys.deviceId)
            return newId
        }
    }

    var accessToken: String? {
        get { try? getString(forKey: Keys.accessToken) }
        set {
            if let token = newValue {
                try? saveString(token, forKey: Keys.accessToken)
            } else {
                try? deleteItem(forKey: Keys.accessToken)
            }
        }
    }

    var refreshToken: String? {
        get { try? getString(forKey: Keys.refreshToken) }
        set {
            if let token = newValue {
                try? saveString(token, forKey: Keys.refreshToken)
            } else {
                try? deleteItem(forKey: Keys.refreshToken)
            }
        }
    }

    var pairId: String? {
        get { try? getString(forKey: Keys.pairId) }
        set {
            if let id = newValue {
                try? saveString(id, forKey: Keys.pairId)
            } else {
                try? deleteItem(forKey: Keys.pairId)
            }
        }
    }

    var userId: String? {
        get { try? getString(forKey: Keys.userId) }
        set {
            if let id = newValue {
                try? saveString(id, forKey: Keys.userId)
            } else {
                try? deleteItem(forKey: Keys.userId)
            }
        }
    }

    // Legacy aliases for backward compatibility
    var authToken: String? {
        get { accessToken }
        set { accessToken = newValue }
    }

    // MARK: - Session helpers
    var isAuthenticated: Bool {
        accessToken != nil && refreshToken != nil && userId != nil
    }

    func saveAuthSession(accessToken: String, refreshToken: String, userId: String, pairId: String?) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.userId = userId
        self.pairId = pairId
    }

    // MARK: - Clear Data
    func clearAllData() {
        try? deleteItem(forKey: Keys.accessToken)
        try? deleteItem(forKey: Keys.refreshToken)
        try? deleteItem(forKey: Keys.pairId)
        try? deleteItem(forKey: Keys.userId)
        // Keep deviceId
    }

    func clearEverything() {
        clearAllData()
        try? deleteItem(forKey: Keys.deviceId)
    }

    // MARK: - Private Methods
    private func saveString(_ string: String, forKey key: String) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.unexpectedData
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unhandledError(status: status)
        }
    }

    private func getString(forKey key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.unhandledError(status: status)
        }

        guard let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedData
        }

        return string
    }

    private func deleteItem(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }
}
