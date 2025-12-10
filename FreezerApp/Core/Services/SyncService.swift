import Foundation
import Combine

@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var syncStatus: SyncStatus = SyncStatus()
    @Published var currentPair: Pair?

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
        // Check if user is already in a pair
        if keychain.pairId != nil, keychain.authToken != nil {
            // Start syncing
            startPeriodicSync()
        }
    }

    // MARK: - Pair Management
    func createPair(name: String) async throws -> String {
        let deviceId = keychain.deviceId

        do {
            let response = try await apiClient.createPair(deviceId: deviceId, pairName: name)

            // Save credentials
            keychain.authToken = response.token
            keychain.pairId = response.pairId
            keychain.userId = response.userId

            // Update state
            lastKnownVersion = Int64(response.serverVersion) ?? 0
            currentPair = Pair(
                id: response.pairId,
                name: name,
                serverVersion: lastKnownVersion
            )

            // Start syncing
            startPeriodicSync()

            return response.inviteCode
        } catch {
            throw error
        }
    }

    func joinPair(inviteCode: String) async throws {
        let deviceId = keychain.deviceId

        do {
            let response = try await apiClient.joinPair(deviceId: deviceId, inviteCode: inviteCode)

            // Save credentials
            keychain.authToken = response.token
            keychain.pairId = response.pairId
            keychain.userId = response.userId

            // Update state
            lastKnownVersion = Int64(response.serverVersion) ?? 0

            // Apply initial data from server
            // This will be handled by DataRepository
            NotificationCenter.default.post(
                name: .didReceiveInitialData,
                object: nil,
                userInfo: ["data": response.initialData]
            )

            // Start syncing
            startPeriodicSync()
        } catch {
            throw error
        }
    }

    func leavePair() async throws {
        guard let token = keychain.authToken else { return }

        stopPeriodicSync()

        do {
            try await apiClient.leavePair(token: token)

            // Clear all data
            keychain.clearAllData()
            currentPair = nil
            lastKnownVersion = 0
            pendingChanges.removeAll()
            syncStatus = SyncStatus()

            // Notify to clear local data
            NotificationCenter.default.post(name: .didLeavePair, object: nil)
        } catch {
            throw error
        }
    }

    // MARK: - Sync
    func syncNow() async {
        guard !isSyncing else { return }
        await performSync()
    }

    func queueChange(_ change: PendingChange) {
        pendingChanges.append(change)
        syncStatus.pendingChangesCount = pendingChanges.count

        // Trigger immediate sync if online
        Task {
            await performSync()
        }
    }

    private func performSync() async {
        guard let token = keychain.authToken else { return }
        guard !isSyncing else { return }

        isSyncing = true
        syncStatus.state = .syncing

        do {
            // Collect pending changes
            let changes = collectPendingChanges()

            // Perform sync
            let response = try await apiClient.sync(
                token: token,
                lastKnownVersion: lastKnownVersion,
                changes: changes
            )

            // Update version
            if let newVersion = Int64(response.serverVersion) {
                lastKnownVersion = newVersion
            }

            // Clear applied changes
            if response.appliedChanges > 0 {
                pendingChanges.removeAll()
                syncStatus.pendingChangesCount = 0
            }

            // Apply server changes
            if !response.serverChanges.categories.isEmpty ||
               !response.serverChanges.items.isEmpty ||
               !response.serverChanges.history.isEmpty {
                NotificationCenter.default.post(
                    name: .didReceiveServerChanges,
                    object: nil,
                    userInfo: ["changes": response.serverChanges]
                )
            }

            // Update status
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
        // For now, return empty changes
        // This will be populated by DataRepository
        return APIClient.SyncData(
            categories: [],
            items: [],
            history: []
        )
    }

    private func handleSyncError(_ error: APIError) {
        switch error {
        case .unauthorized:
            syncStatus.state = .error("Токен истек")
            stopPeriodicSync()
            keychain.clearAllData()
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

        // Sync every 5 seconds in active mode
        syncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.performSync()
            }
        }

        // Perform initial sync
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
        // Could reduce sync frequency here
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
}

// MARK: - Notifications
extension Notification.Name {
    static let didReceiveInitialData = Notification.Name("didReceiveInitialData")
    static let didReceiveServerChanges = Notification.Name("didReceiveServerChanges")
    static let didLeavePair = Notification.Name("didLeavePair")
}
