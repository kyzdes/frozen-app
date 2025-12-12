import Foundation
import Combine

@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var syncStatus: SyncStatus = SyncStatus()
    @Published var currentPair: Pair?

    private let apiClient = APIClient.shared
    private let keychain = KeychainService.shared
    private let analytics = AnalyticsService.shared
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
        if let pairId = keychain.pairId, keychain.authToken != nil {
            // Restore pair state so UI reflects existing connection
            currentPair = Pair(id: pairId, name: "Общий холодильник", serverVersion: lastKnownVersion)

            // Start syncing
            startPeriodicSync()
        }
    }

    // MARK: - Pair Management
    func createPair(name: String) async throws -> String {
        print("🔵 SyncService: createPair called with name: \(name)")

        // Stop any active sync
        stopPeriodicSync()

        // Clear old pair data to allow creating new pair
        if keychain.pairId != nil {
            print("⚠️ SyncService: Clearing old pair data")
            keychain.clearAllData()
            currentPair = nil
            lastKnownVersion = 0
            pendingChanges.removeAll()
            syncStatus = SyncStatus()
        }

        // Generate fresh deviceId to avoid conflicts
        let deviceId = keychain.generateNewDeviceId()
        print("🔵 SyncService: Generated new deviceId: \(deviceId)")

        do {
            let response = try await apiClient.createPair(deviceId: deviceId, pairName: name)
            print("✅ SyncService: Pair created successfully")

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
            analytics.trackPairCreated(pairId: response.pairId)

            return response.inviteCode
        } catch let error as APIError {
            print("❌ SyncService: createPair failed - \(error)")

            // If still getting 409 conflict, try one more time with another new deviceId
            if case .serverError(let message) = error,
               message.contains("already belongs to a pair") {
                print("🔄 SyncService: Retrying with another new deviceId")
                let newDeviceId = keychain.generateNewDeviceId()

                do {
                    let retryResponse = try await apiClient.createPair(deviceId: newDeviceId, pairName: name)
                    print("✅ SyncService: Pair created on retry")

                    keychain.authToken = retryResponse.token
                    keychain.pairId = retryResponse.pairId
                    keychain.userId = retryResponse.userId

                    lastKnownVersion = Int64(retryResponse.serverVersion) ?? 0
                    currentPair = Pair(
                        id: retryResponse.pairId,
                        name: name,
                        serverVersion: lastKnownVersion
                    )

                    startPeriodicSync()
                    analytics.trackPairCreated(pairId: retryResponse.pairId)
                    return retryResponse.inviteCode
                } catch {
                    print("❌ SyncService: Retry also failed - \(error)")
                    throw error
                }
            }

            throw error
        } catch {
            print("❌ SyncService: createPair failed - \(error)")
            throw error
        }
    }

    func joinPair(inviteCode: String) async throws {
        print("🔵 SyncService: joinPair called with code: \(inviteCode)")

        // Stop any active sync
        stopPeriodicSync()

        // Clear old pair data to allow joining new pair
        if keychain.pairId != nil {
            print("⚠️ SyncService: Clearing old pair data")
            keychain.clearAllData()
            currentPair = nil
            lastKnownVersion = 0
            pendingChanges.removeAll()
            syncStatus = SyncStatus()
        }

        // Generate fresh deviceId to avoid conflicts
        let deviceId = keychain.generateNewDeviceId()
        print("🔵 SyncService: Generated new deviceId: \(deviceId)")

        do {
            let response = try await apiClient.joinPair(deviceId: deviceId, inviteCode: inviteCode)
            print("✅ SyncService: Joined pair successfully")

            // Save credentials
            keychain.authToken = response.token
            keychain.pairId = response.pairId
            keychain.userId = response.userId

            // Update state
            lastKnownVersion = Int64(response.serverVersion) ?? 0
            currentPair = Pair(
                id: response.pairId,
                name: "Общий холодильник",
                serverVersion: lastKnownVersion
            )

            // Apply initial data from server
            // This will be handled by DataRepository
            NotificationCenter.default.post(
                name: .didReceiveInitialData,
                object: nil,
                userInfo: ["data": response.initialData]
            )

            // Start syncing
            startPeriodicSync()
            analytics.trackPairJoined(pairId: response.pairId)
        } catch let error as APIError {
            print("❌ SyncService: joinPair failed - \(error)")

            // If still getting 409 conflict, try one more time with another new deviceId
            if case .serverError(let message) = error,
               message.contains("already belongs to a pair") {
                print("🔄 SyncService: Retrying with another new deviceId")
                let newDeviceId = keychain.generateNewDeviceId()

                do {
                    let retryResponse = try await apiClient.joinPair(deviceId: newDeviceId, inviteCode: inviteCode)
                    print("✅ SyncService: Joined pair on retry")

                    keychain.authToken = retryResponse.token
                    keychain.pairId = retryResponse.pairId
                    keychain.userId = retryResponse.userId

                    lastKnownVersion = Int64(retryResponse.serverVersion) ?? 0
                    currentPair = Pair(
                        id: retryResponse.pairId,
                        name: "Общий холодильник",
                        serverVersion: lastKnownVersion
                    )

                    NotificationCenter.default.post(
                        name: .didReceiveInitialData,
                        object: nil,
                        userInfo: ["data": retryResponse.initialData]
                    )

                    startPeriodicSync()
                    analytics.trackPairJoined(pairId: retryResponse.pairId)
                    return
                } catch {
                    print("❌ SyncService: Retry also failed - \(error)")
                    throw error
                }
            }

            throw error
        } catch {
            print("❌ SyncService: joinPair failed - \(error)")
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
                if let event = change.historyEvent {
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
    let category: Category?
    let item: Item?
    let historyEvent: HistoryEvent?
}

// MARK: - Notifications
extension Notification.Name {
    static let didReceiveInitialData = Notification.Name("didReceiveInitialData")
    static let didReceiveServerChanges = Notification.Name("didReceiveServerChanges")
    static let didLeavePair = Notification.Name("didLeavePair")
}
