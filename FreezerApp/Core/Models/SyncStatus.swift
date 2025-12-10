import Foundation

enum SyncState: Equatable {
    case idle
    case syncing
    case success
    case offline
    case error(String)
    case pendingChanges(Int)
}

struct SyncStatus {
    var state: SyncState
    var lastSyncDate: Date?
    var pendingChangesCount: Int

    init(
        state: SyncState = .idle,
        lastSyncDate: Date? = nil,
        pendingChangesCount: Int = 0
    ) {
        self.state = state
        self.lastSyncDate = lastSyncDate
        self.pendingChangesCount = pendingChangesCount
    }

    var displayText: String {
        switch state {
        case .idle:
            if let lastSync = lastSyncDate {
                let formatter = RelativeDateTimeFormatter()
                formatter.unitsStyle = .short
                return "Синхронизировано \(formatter.localizedString(for: lastSync, relativeTo: Date()))"
            }
            return "Не синхронизировано"
        case .syncing:
            return "Синхронизация..."
        case .success:
            return "✓ Синхронизировано"
        case .offline:
            return "⊘ Офлайн"
        case .error(let message):
            return "✕ Ошибка: \(message)"
        case .pendingChanges(let count):
            return "⚠ Несинхр.: \(count)"
        }
    }

    var iconName: String {
        switch state {
        case .idle:
            return "arrow.triangle.2.circlepath"
        case .syncing:
            return "arrow.triangle.2.circlepath"
        case .success:
            return "checkmark.circle.fill"
        case .offline:
            return "wifi.slash"
        case .error:
            return "exclamationmark.triangle.fill"
        case .pendingChanges:
            return "exclamationmark.circle.fill"
        }
    }

    var iconColor: String {
        switch state {
        case .idle:
            return "gray"
        case .syncing:
            return "blue"
        case .success:
            return "green"
        case .offline:
            return "gray"
        case .error:
            return "red"
        case .pendingChanges:
            return "orange"
        }
    }
}
