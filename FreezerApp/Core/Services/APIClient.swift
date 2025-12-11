import Foundation

enum APIError: Error {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case networkError(Error)
}

class APIClient {
    static let shared = APIClient()

    private let baseURL = "https://apps.moone.dev"
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Pair Management
    struct CreatePairRequest: Codable {
        let deviceId: String
        let pairName: String

        enum CodingKeys: String, CodingKey {
            case deviceId = "device_id"
            case pairName = "pair_name"
        }
    }

    struct CreatePairResponse: Codable {
        let pairId: String
        let userId: String
        let inviteCode: String
        let inviteExpiresAt: String
        let token: String
        let serverVersion: String

        enum CodingKeys: String, CodingKey {
            case pairId = "pair_id"
            case userId = "user_id"
            case inviteCode = "invite_code"
            case inviteExpiresAt = "invite_expires_at"
            case token
            case serverVersion = "server_version"
        }
    }

    func createPair(deviceId: String, pairName: String) async throws -> CreatePairResponse {
        let url = URL(string: "\(baseURL)/pair/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = CreatePairRequest(deviceId: deviceId, pairName: pairName)
        request.httpBody = try encoder.encode(body)

        return try await performRequest(request)
    }

    struct JoinPairRequest: Codable {
        let deviceId: String
        let inviteCode: String

        enum CodingKeys: String, CodingKey {
            case deviceId = "device_id"
            case inviteCode = "invite_code"
        }
    }

    struct JoinPairResponse: Codable {
        let pairId: String
        let userId: String
        let token: String
        let serverVersion: String
        let initialData: SyncData

        enum CodingKeys: String, CodingKey {
            case pairId = "pair_id"
            case userId = "user_id"
            case token
            case serverVersion = "server_version"
            case initialData = "initial_data"
        }
    }

    func joinPair(deviceId: String, inviteCode: String) async throws -> JoinPairResponse {
        let url = URL(string: "\(baseURL)/pair/join")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = JoinPairRequest(deviceId: deviceId, inviteCode: inviteCode)
        request.httpBody = try encoder.encode(body)

        return try await performRequest(request)
    }

    func leavePair(token: String) async throws {
        let url = URL(string: "\(baseURL)/pair/leave")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError("Failed to leave pair")
        }
    }

    // MARK: - Sync
    struct SyncRequest: Codable {
        let lastKnownVersion: Int64
        let changes: SyncData

        enum CodingKeys: String, CodingKey {
            case lastKnownVersion = "last_known_version"
            case changes
        }
    }

    struct SyncResponse: Codable {
        let serverVersion: String
        let appliedChanges: Int
        let serverChanges: SyncData

        enum CodingKeys: String, CodingKey {
            case serverVersion = "server_version"
            case appliedChanges = "applied_changes"
            case serverChanges = "server_changes"
        }
    }

    struct SyncData: Codable {
        let categories: [Category]
        let items: [Item]
        let history: [HistoryEvent]
    }

    func sync(token: String, lastKnownVersion: Int64, changes: SyncData) async throws -> SyncResponse {
        let url = URL(string: "\(baseURL)/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = SyncRequest(lastKnownVersion: lastKnownVersion, changes: changes)
        request.httpBody = try encoder.encode(body)

        return try await performRequest(request)
    }

    // MARK: - Helper Methods
    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ APIClient: Invalid response type")
                throw APIError.serverError("Неверный ответ сервера")
            }

            print("📡 APIClient: Status \(httpResponse.statusCode)")

            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }

            if httpResponse.statusCode >= 400 {
                // Try to decode error response
                if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                    print("❌ APIClient: Server error - \(errorResponse.message)")
                    throw APIError.serverError(errorResponse.message)
                }

                // If decoding failed, try to get string from data
                if let errorString = String(data: data, encoding: .utf8) {
                    print("❌ APIClient: Raw error - \(errorString)")
                }

                throw APIError.serverError("Ошибка сервера (HTTP \(httpResponse.statusCode))")
            }

            do {
                let result = try decoder.decode(T.self, from: data)
                print("✅ APIClient: Request successful")
                return result
            } catch {
                print("❌ APIClient: Decoding error - \(error)")
                if let dataString = String(data: data, encoding: .utf8) {
                    print("📄 Response data: \(dataString)")
                }
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            print("❌ APIClient: Network error - \(error)")
            throw APIError.networkError(error)
        }
    }

    struct ErrorResponse: Codable {
        let error: String
        let message: String
    }
}

extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Неверный адрес сервера"
        case .noData:
            return "Пустой ответ сервера"
        case .decodingError:
            return "Не удалось обработать ответ сервера"
        case .serverError(let message):
            if message.localizedCaseInsensitiveContains("already belongs to a pair") {
                return "Вы уже подключены к холодильнику. Сначала покиньте текущий."
            }
            if message.localizedCaseInsensitiveContains("invalid invite code") {
                return "Неверный код приглашения"
            }
            if message.localizedCaseInsensitiveContains("invite code expired") {
                return "Срок действия кода истек"
            }
            if message.localizedCaseInsensitiveContains("invite code already used") {
                return "Код приглашения уже использован"
            }
            if message.localizedCaseInsensitiveContains("pair is full") {
                return "В холодильнике уже два участника"
            }
            return message
        case .unauthorized:
            return "Сессия истекла, попробуйте подключиться заново"
        case .networkError(let error):
            if let urlError = error as? URLError, urlError.code == .notConnectedToInternet {
                return "Нет подключения к интернету"
            }
            return error.localizedDescription
        }
    }
}
