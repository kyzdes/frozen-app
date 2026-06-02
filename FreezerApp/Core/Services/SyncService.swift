import Foundation
import Combine

@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var syncStatus: SyncStatus = SyncStatus()
    @Published var currentPair: Pair?
    @Published var pairMode: String = "none"

    private let apiClient = APIClient.shared
    private let keychain = KeychainService.shared
    private var syncTimer: Timer?
    private var pendingChanges: [PendingChange] = []
    private var lastKnownVersion: Int64 = 0
    private var isSyncing = false

    private init() {
        setupInitialState()
    }

    // MARK: - Setup
    private func setupInitialState() {
        if let pairId = keychain.pairId, keychain.accessToken != nil {
            currentPair = Pair(id: pairId, name: "Холодильник", serverVersion: lastKnownVersion)
            pairMode = "personal"
            startPeriodicSync()
        }
    }

    func applyAuthContext(user: APIClient.AuthUser, pairContext: APIClient.PairContext) {
        keychain.userId = user.id
        keychain.pairId = pairContext.activePairId

        if let pairId = pairContext.activePairId {
            currentPair = Pair(
                id: pairId,
                name: pairContext.activePairName ?? "Холодильник",
                serverVersion: 0
            )
            pairMode = pairContext.mode
            lastKnownVersion = 0
            pendingChanges.removeAll()
            syncStatus = SyncStatus()
            startPeriodicSync()
        } else {
            stopPeriodicSync()
            currentPair = nil
            pairMode = "none"
            lastKnownVersion = 0
        }
    }

    func clearSession() {
        stopPeriodicSync()
        keychain.clearAllData()
        currentPair = nil
        pairMode = "none"
        lastKnownVersion = 0
        pendingChanges.removeAll()
        syncStatus = SyncStatus()
    }

    // MARK: - Pair Management
    func createPair(name: String) async throws -> String {
        let response = try await apiClient.createPair(pairName: name)

        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId
        keychain.userId = response.userId

        lastKnownVersion = Int64(response.serverVersion) ?? 0
        currentPair = Pair(id: response.pairId, name: name, serverVersion: lastKnownVersion)
        pairMode = response.pairContext.mode

        startPeriodicSync()
        return response.inviteCode
    }

    func joinPair(inviteCode: String, importMode: String) async throws {
        let response = try await apiClient.joinPair(inviteCode: inviteCode, importMode: importMode)

        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId
        keychain.userId = response.userId

        lastKnownVersion = Int64(response.serverVersion) ?? 0
        currentPair = Pair(
            id: response.pairId,
            name: response.pairContext.activePairName ?? "Общий холодильник",
            serverVersion: lastKnownVersion
        )
        pairMode = response.pairContext.mode

        NotificationCenter.default.post(
            name: .didReceiveInitialData,
            object: nil,
            userInfo: ["data": response.initialData]
        )

        startPeriodicSync()
    }

    func leavePair() async throws {
        let response = try await apiClient.leavePair()

        keychain.accessToken = response.accessToken
        keychain.pairId = response.pairId

        lastKnownVersion = Int64(response.serverVersion) ?? 0
        currentPair = Pair(
            id: response.pairId,
            name: response.pairContext.activePairName ?? "Мой холодильник",
            serverVersion: lastKnownVersion
        )
        pairMode = response.pairContext.mode

        NotificationCenter.default.post(
            name: .didReceiveInitialData,
            object: nil,
            userInfo: ["data": response.initialData]
        )

        startPeriodicSync()
    }

    // MARK: - Sync
    func syncNow() async {
        guard !isSyncing else { return }
        await performSync()
    }

    func queueChange(_ change: PendingChange) {
        pendingChanges.append(change)
        syncStatus.pendingChangesCount = pendingChanges.count

        Task {
            await performSync()
        }
    }

    private func performSync() async {
        guard keychain.accessToken != nil else { return }
        guard !isSyncing else { return }

        isSyncing = true
        syncStatus.state = .syncing

        do {
            let changes = collectPendingChanges()

            let response = try await apiClient.sync(
                lastKnownVersion: lastKnownVersion,
                changes: changes
            )

            if let newVersion = Int64(response.serverVersion) {
                lastKnownVersion = newVersion
            }

            if response.appliedChanges > 0 {
                pendingChanges.removeAll()
                syncStatus.pendingChangesCount = 0
            }

            if !response.serverChanges.categories.isEmpty ||
               !response.serverChanges.items.isEmpty ||
               !response.serverChanges.history.isEmpty {
                NotificationCenter.default.post(
                    name: .didReceiveServerChanges,
                    object: nil,
                    userInfo: ["changes": response.serverChanges]
                )
            }

            syncStatus.state = .success
            syncStatus.lastSyncDate = Date()
        } catch let error as APIError {
            handleSyncError(error)
        } catch {
            syncStatus.state = .error(error.localizedDescription)
        }

        isSyncing = false
    }

    private func collectPendingChanges() -> APIClient.SyncData {
        var categories: [String: Category] = [:]
        var items: [String: Item] = [:]
        var history: [String: HistoryEvent] = [:]

        for change in pendingChanges {
            switch change.type {
            case .categoryAdded, .categoryUpdated, .categoryDeleted:
                if let category = change.category {
                    categories[category.id] = category
                }
            case .itemAdded, .itemUpdated, .itemDeleted:
                if let item = change.item {
                    items[item.id] = item
                }
            case .historyAdded:
                // Never upload `.unknown` events: their raw value would violate the
                // backend's history_events_type_check (5 canonical values, migration 005).
                if let event = change.historyEvent, event.type != .unknown {
                    history[event.id] = event
                }
            }
        }

        return APIClient.SyncData(
            categories: Array(categories.values),
            items: Array(items.values),
            history: Array(history.values)
        )
    }

    private func handleSyncError(_ error: APIError) {
        switch error {
        case .unauthorized:
            syncStatus.state = .error("Сессия истекла")
            clearSession()
            NotificationCenter.default.post(name: .didAuthExpired, object: nil)
        case .networkError:
            syncStatus.state = .offline
        case .serverError(let message):
            syncStatus.state = .error(message)
        default:
            syncStatus.state = .error("Ошибка синхронизации")
        }
    }

    // MARK: - Periodic Sync
    private func startPeriodicSync() {
        stopPeriodicSync()

        syncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.performSync()
            }
        }

        Task {
            await performSync()
        }
    }

    private func stopPeriodicSync() {
        syncTimer?.invalidate()
        syncTimer = nil
    }

    // MARK: - App Lifecycle
    func handleAppDidBecomeActive() {
        if keychain.pairId != nil {
            Task {
                await performSync()
            }
        }
    }

    func handleAppWillResignActive() {
        // Best-effort final flush of queued local changes before the app is
        // backgrounded/terminated. Local edits are already persisted by
        // DataRepository, so this only accelerates propagation; it is not a
        // correctness dependency.
        if keychain.pairId != nil {
            Task {
                await performSync()
            }
        }
    }
}

// MARK: - Pending Change
struct PendingChange: Codable {
    enum ChangeType: String, Codable {
        case categoryAdded
        case categoryUpdated
        case categoryDeleted
        case itemAdded
        case itemUpdated
        case itemDeleted
        case historyAdded
    }

    let type: ChangeType
    let entityId: String
    let timestamp: Date
    let category: Category?
    let item: Item?
    let historyEvent: HistoryEvent?
}

// MARK: - Notifications
extension Notification.Name {
    static let didReceiveInitialData = Notification.Name("didReceiveInitialData")
    static let didReceiveServerChanges = Notification.Name("didReceiveServerChanges")
    static let didLeavePair = Notification.Name("didLeavePair")
    static let didAuthExpired = Notification.Name("didAuthExpired")
}
