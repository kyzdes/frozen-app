import Foundation
import OSLog

/// Сервис для отслеживания событий пользователя и аналитики
final class AnalyticsService {
    static let shared = AnalyticsService()

    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "Analytics")
    private let apiClient = APIClient.shared
    private let keychain = KeychainService.shared
    private let sessionId: String

    private init() {
        let key = "analytics_session_id"
        if let existing = UserDefaults.standard.string(forKey: key) {
            sessionId = existing
        } else {
            let generated = UUID().uuidString
            UserDefaults.standard.set(generated, forKey: key)
            sessionId = generated
        }
    }

    // MARK: - App Events
    func trackAppOpened() {
        logger.info("App opened")
        send(event: "app_opened", parameters: [:])
    }

    func trackNotificationsEnabled() {
        logger.info("Notifications enabled")
        send(event: "notifications_enabled", parameters: [:])
    }

    // MARK: - Category Events
    func trackCategoryCreated(name: String, icon: String?) {
        logger.info("Category created: \(name, privacy: .public)")
        send(event: "category_created", parameters: [
            "name": name,
            "icon": icon ?? "none"
        ])
    }

    func trackCategoryEdited(categoryId: String, name: String) {
        logger.info("Category edited: \(categoryId, privacy: .public)")
        send(event: "category_edited", parameters: [
            "category_id": categoryId,
            "name": name
        ])
    }

    func trackCategoryDeleted(categoryId: String, itemCount: Int) {
        logger.info("Category deleted: \(categoryId, privacy: .public) with \(itemCount) items")
        send(event: "category_deleted", parameters: [
            "category_id": categoryId,
            "item_count": String(itemCount)
        ])
    }

    func trackCategoryReordered() {
        logger.info("Categories reordered")
        send(event: "categories_reordered", parameters: [:])
    }

    func trackCategoryExpanded(categoryId: String) {
        logger.info("Category expanded: \(categoryId, privacy: .public)")
        send(event: "category_expanded", parameters: [
            "category_id": categoryId
        ])
    }

    func trackCategoryCollapsed(categoryId: String) {
        logger.info("Category collapsed: \(categoryId, privacy: .public)")
        send(event: "category_collapsed", parameters: [
            "category_id": categoryId
        ])
    }

    func trackAllCategoriesExpanded(count: Int) {
        logger.info("All categories expanded: \(count) categories")
        send(event: "all_categories_expanded", parameters: [
            "count": String(count)
        ])
    }

    func trackAllCategoriesCollapsed(count: Int) {
        logger.info("All categories collapsed: \(count) categories")
        send(event: "all_categories_collapsed", parameters: [
            "count": String(count)
        ])
    }

    // MARK: - Item Events
    func trackItemCreated(name: String, categoryId: String, shelfNumber: Int) {
        logger.info("Item created: \(name, privacy: .public) in category \(categoryId, privacy: .public)")
        send(event: "item_created", parameters: [
            "name": name,
            "category_id": categoryId,
            "shelf_number": String(shelfNumber)
        ])
    }

    func trackItemEdited(itemId: String, name: String) {
        logger.info("Item edited: \(itemId, privacy: .public)")
        send(event: "item_edited", parameters: [
            "item_id": itemId,
            "name": name
        ])
    }

    func trackItemDeleted(itemId: String, categoryId: String) {
        logger.info("Item deleted: \(itemId, privacy: .public)")
        send(event: "item_deleted", parameters: [
            "item_id": itemId,
            "category_id": categoryId
        ])
    }

    func trackItemPackagesUpdated(itemId: String, delta: Int, newCount: Int) {
        logger.info("Item packages updated: \(itemId, privacy: .public), delta: \(delta), new count: \(newCount)")
        send(event: "item_packages_updated", parameters: [
            "item_id": itemId,
            "delta": String(delta),
            "new_count": String(newCount)
        ])
    }

    func trackItemItemsUpdated(itemId: String, delta: Int, newCount: Int) {
        logger.info("Item items updated: \(itemId, privacy: .public), delta: \(delta), new count: \(newCount)")
        send(event: "item_items_updated", parameters: [
            "item_id": itemId,
            "delta": String(delta),
            "new_count": String(newCount)
        ])
    }

    // MARK: - Search & Filter Events
    func trackSearch(query: String, resultsCount: Int) {
        logger.info("Search performed: \(query, privacy: .public), results: \(resultsCount)")
        send(event: "search_performed", parameters: [
            "query": query,
            "results_count": String(resultsCount)
        ])
    }

    func trackShelfFilterApplied(shelfNumber: Int, resultsCount: Int) {
        logger.info("Shelf filter applied: \(shelfNumber), results: \(resultsCount)")
        send(event: "shelf_filter_applied", parameters: [
            "shelf_number": String(shelfNumber),
            "results_count": String(resultsCount)
        ])
    }

    func trackFilterCleared() {
        logger.info("Filter cleared")
        send(event: "filter_cleared", parameters: [:])
    }

    // MARK: - Private
    private func send(event: String, parameters: [String: String]) {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "ios-local"

        let payload = APIClient.AnalyticsEventPayload(
            event: event,
            deviceId: keychain.deviceId,
            userId: keychain.userId,
            pairId: keychain.pairId,
            timestamp: Date(),
            properties: parameters.isEmpty ? nil : parameters,
            platform: "ios",
            appVersion: version,
            clientTs: Date(),
            sessionId: sessionId
        )

        Task {
            await apiClient.sendAnalyticsEvent(payload)
        }

        #if DEBUG
        print("📊 Analytics Event: \(event)")
        if !parameters.isEmpty {
            print("   Parameters: \(parameters)")
        }
        #endif
    }
}
