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

    #if DEBUG
    private let baseURL = "http://localhost:3000"
    #else
    private let baseURL = "https://apps.moone.dev"
    #endif
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let keychain = KeychainService.shared
    private var refreshTask: Task<Void, Error>?

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Auth
    struct AuthUser: Codable {
        let id: String
        let name: String
        let email: String
        let personalPairId: String?
        let activePairId: String?

        enum CodingKeys: String, CodingKey {
            case id
            case name
            case email
            case personalPairId = "personal_pair_id"
            case activePairId = "active_pair_id"
        }
    }

    struct PairContext: Codable {
        let activePairId: String?
        let personalPairId: String?
        let mode: String
        let activePairName: String?

        enum CodingKeys: String, CodingKey {
            case activePairId = "active_pair_id"
            case personalPairId = "personal_pair_id"
            case mode
            case activePairName = "active_pair_name"
        }
    }

    struct AuthTokens: Codable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
        }
    }

    struct AuthResponse: Codable {
        let user: AuthUser
        let tokens: AuthTokens
        let pairContext: PairContext

        enum CodingKeys: String, CodingKey {
            case user
            case tokens
            case pairContext = "pair_context"
        }
    }

    struct MeResponse: Codable {
        let user: AuthUser
        let pairContext: PairContext

        enum CodingKeys: String, CodingKey {
            case user
            case pairContext = "pair_context"
        }
    }

    struct RegisterRequest: Codable {
        let name: String
        let email: String
        let password: String
    }

    struct LoginRequest: Codable {
        let email: String
        let password: String
    }

    struct RefreshRequest: Codable {
        let refreshToken: String

        enum CodingKeys: String, CodingKey {
            case refreshToken = "refresh_token"
        }
    }

    func register(name: String, email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(RegisterRequest(name: name, email: email, password: password))

        let response: AuthResponse = try await performRequest(request)
        persistAuth(response)
        return response
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(LoginRequest(email: email, password: password))

        let response: AuthResponse = try await performRequest(request)
        persistAuth(response)
        return response
    }

    func me() async throws -> MeResponse {
        let url = URL(string: "\(baseURL)/auth/me")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        return try await performRequest(request, requiresAuth: true)
    }

    func logout() async {
        guard keychain.accessToken != nil else {
            keychain.clearAllData()
            return
        }

        let url = URL(string: "\(baseURL)/auth/logout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        do {
            let _: EmptyResponse = try await performRequest(request, requiresAuth: true)
        } catch {
            // Ignore logout failures.
        }

        keychain.clearAllData()
    }

    // MARK: - Pair Management
    struct CreatePairRequest: Codable {
        let pairName: String

        enum CodingKeys: String, CodingKey {
            case pairName = "pair_name"
        }
    }

    struct CreatePairResponse: Codable {
        let pairId: String
        let userId: String
        let inviteCode: String
        let inviteExpiresAt: String
        let accessToken: String
        let token: String
        let serverVersion: String
        let pairContext: PairContext

        enum CodingKeys: String, CodingKey {
            case pairId = "pair_id"
            case userId = "user_id"
            case inviteCode = "invite_code"
            case inviteExpiresAt = "invite_expires_at"
            case accessToken = "access_token"
            case token
            case serverVersion = "server_version"
            case pairContext = "pair_context"
        }
    }

    func createPair(pairName: String) async throws -> CreatePairResponse {
        let url = URL(string: "\(baseURL)/pair/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = CreatePairRequest(pairName: pairName)
        request.httpBody = try encoder.encode(body)

        let response: CreatePairResponse = try await performRequest(request, requiresAuth: true)
        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId
        return response
    }

    struct JoinPairRequest: Codable {
        let inviteCode: String
        let importMode: String

        enum CodingKeys: String, CodingKey {
            case inviteCode = "invite_code"
            case importMode = "import_mode"
        }
    }

    struct JoinPairResponse: Codable {
        let pairId: String
        let userId: String
        let accessToken: String
        let token: String
        let serverVersion: String
        let pairContext: PairContext
        let initialData: SyncData

        enum CodingKeys: String, CodingKey {
            case pairId = "pair_id"
            case userId = "user_id"
            case accessToken = "access_token"
            case token
            case serverVersion = "server_version"
            case pairContext = "pair_context"
            case initialData = "initial_data"
        }
    }

    func joinPair(inviteCode: String, importMode: String) async throws -> JoinPairResponse {
        let url = URL(string: "\(baseURL)/pair/join")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = JoinPairRequest(inviteCode: inviteCode, importMode: importMode)
        request.httpBody = try encoder.encode(body)

        let response: JoinPairResponse = try await performRequest(request, requiresAuth: true)
        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId
        return response
    }

    struct LeavePairResponse: Codable {
        let success: Bool
        let pairId: String
        let serverVersion: String
        let accessToken: String
        let token: String
        let pairContext: PairContext
        let initialData: SyncData

        enum CodingKeys: String, CodingKey {
            case success
            case pairId = "pair_id"
            case serverVersion = "server_version"
            case accessToken = "access_token"
            case token
            case pairContext = "pair_context"
            case initialData = "initial_data"
        }
    }

    func leavePair() async throws -> LeavePairResponse {
        let url = URL(string: "\(baseURL)/pair/leave")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let response: LeavePairResponse = try await performRequest(request, requiresAuth: true)
        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId
        return response
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

    func sync(lastKnownVersion: Int64, changes: SyncData) async throws -> SyncResponse {
        let url = URL(string: "\(baseURL)/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = SyncRequest(lastKnownVersion: lastKnownVersion, changes: changes)
        request.httpBody = try encoder.encode(body)

        return try await performRequest(request, requiresAuth: true)
    }

    // MARK: - Analytics
    struct AnalyticsEventPayload: Codable {
        let event: String
        let deviceId: String
        let userId: String?
        let pairId: String?
        let timestamp: Date
        let properties: [String: String]?
        let platform: String
        let appVersion: String
        let clientTs: Date
        let sessionId: String

        enum CodingKeys: String, CodingKey {
            case event
            case deviceId = "device_id"
            case userId = "user_id"
            case pairId = "pair_id"
            case timestamp
            case properties
            case platform
            case appVersion = "app_version"
            case clientTs = "client_ts"
            case sessionId = "session_id"
        }
    }

    func sendAnalyticsEvent(_ payload: AnalyticsEventPayload) async {
        let url = URL(string: "\(baseURL)/analytics")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try encoder.encode(payload)
            let _: EmptyResponse = try await performRequest(request)
        } catch {
            #if DEBUG
            print("Analytics send failed: \(error)")
            #endif
        }
    }

    // MARK: - Private helpers
    private func persistAuth(_ response: AuthResponse) {
        keychain.saveAuthSession(
            accessToken: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            userId: response.user.id,
            pairId: response.pairContext.activePairId
        )
    }

    private func refreshTokensIfNeeded() async throws {
        if let activeTask = refreshTask {
            try await activeTask.value
            return
        }

        guard let refreshToken = keychain.refreshToken else {
            keychain.clearAllData()
            throw APIError.unauthorized
        }

        let task = Task {
            let url = URL(string: "\(baseURL)/auth/refresh")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try self.encoder.encode(RefreshRequest(refreshToken: refreshToken))

            let response: AuthResponse = try await self.performRequest(request)
            self.persistAuth(response)
        }

        refreshTask = task
        defer { refreshTask = nil }

        do {
            try await task.value
        } catch {
            keychain.clearAllData()
            throw error
        }
    }

    private func performRequest<T: Decodable>(
        _ baseRequest: URLRequest,
        requiresAuth: Bool = false,
        retryOnUnauthorized: Bool = true
    ) async throws -> T {
        var request = baseRequest

        if requiresAuth {
            guard let token = keychain.accessToken else {
                throw APIError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.serverError("Неверный ответ сервера")
            }

            if httpResponse.statusCode == 401 {
                if requiresAuth && retryOnUnauthorized {
                    try await refreshTokensIfNeeded()
                    return try await performRequest(baseRequest, requiresAuth: requiresAuth, retryOnUnauthorized: false)
                }
                throw APIError.unauthorized
            }

            if httpResponse.statusCode >= 400 {
                if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                    throw APIError.serverError(errorResponse.message)
                }

                if let errorString = String(data: data, encoding: .utf8), !errorString.isEmpty {
                    throw APIError.serverError(errorString)
                }

                throw APIError.serverError("Ошибка сервера (HTTP \(httpResponse.statusCode))")
            }

            if T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }

            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    struct ErrorResponse: Codable {
        let error: String
        let message: String
    }

    struct EmptyResponse: Codable {
        init() {}
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
            if message.localizedCaseInsensitiveContains("invalid email or password") {
                return "Неверный email или пароль"
            }
            return message
        case .unauthorized:
            return "Сессия истекла. Войдите снова"
        case .networkError(let error):
            if let urlError = error as? URLError, urlError.code == .notConnectedToInternet {
                return "Нет подключения к интернету"
            }
            return error.localizedDescription
        }
    }
}
