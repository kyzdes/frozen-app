import Foundation
import OSLog

/// Сервис для отслеживания событий пользователя и аналитики
final class AnalyticsService {
    static let shared = AnalyticsService()

    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "Analytics")
    private let apiClient = APIClient.shared
    private let keychain = KeychainService.shared
    private var hasTrackedAppOpen = false

    private init() {}

    // MARK: - Lifecycle
    func trackAppOpened() {
        guard !hasTrackedAppOpen else { return }
        hasTrackedAppOpen = true

        logEvent("app_opened", parameters: [:])
    }

    // MARK: - Category Events

    func trackCategoryCreated(name: String, icon: String?) {
        logger.info("Category created: \(name, privacy: .public)")
        logEvent("category_created", parameters: [
            "name": name,
            "icon": icon ?? "none"
        ])
    }

    func trackCategoryEdited(categoryId: String, name: String) {
        logger.info("Category edited: \(categoryId, privacy: .public)")
        logEvent("category_edited", parameters: [
            "category_id": categoryId,
            "name": name
        ])
    }

    func trackCategoryDeleted(categoryId: String, itemCount: Int) {
        logger.info("Category deleted: \(categoryId, privacy: .public) with \(itemCount) items")
        logEvent("category_deleted", parameters: [
            "category_id": categoryId,
            "item_count": String(itemCount)
        ])
    }

    func trackCategoryReordered() {
        logger.info("Categories reordered")
        logEvent("categories_reordered", parameters: [:])
    }

    func trackCategoryExpanded(categoryId: String) {
        logger.info("Category expanded: \(categoryId, privacy: .public)")
        logEvent("category_expanded", parameters: [
            "category_id": categoryId
        ])
    }

    func trackCategoryCollapsed(categoryId: String) {
        logger.info("Category collapsed: \(categoryId, privacy: .public)")
        logEvent("category_collapsed", parameters: [
            "category_id": categoryId
        ])
    }

    func trackAllCategoriesExpanded(count: Int) {
        logger.info("All categories expanded: \(count) categories")
        logEvent("all_categories_expanded", parameters: [
            "count": String(count)
        ])
    }

    func trackAllCategoriesCollapsed(count: Int) {
        logger.info("All categories collapsed: \(count) categories")
        logEvent("all_categories_collapsed", parameters: [
            "count": String(count)
        ])
    }

    // MARK: - Item Events

    func trackItemCreated(name: String, categoryId: String, shelfNumber: Int) {
        logger.info("Item created: \(name, privacy: .public) in category \(categoryId, privacy: .public)")
        logEvent("item_created", parameters: [
            "name": name,
            "category_id": categoryId,
            "shelf_number": String(shelfNumber)
        ])
    }

    func trackItemEdited(itemId: String, name: String) {
        logger.info("Item edited: \(itemId, privacy: .public)")
        logEvent("item_edited", parameters: [
            "item_id": itemId,
            "name": name
        ])
    }

    func trackItemDeleted(itemId: String, categoryId: String) {
        logger.info("Item deleted: \(itemId, privacy: .public)")
        logEvent("item_deleted", parameters: [
            "item_id": itemId,
            "category_id": categoryId
        ])
    }

    func trackItemPackagesUpdated(itemId: String, delta: Int, newCount: Int) {
        logger.info("Item packages updated: \(itemId, privacy: .public), delta: \(delta), new count: \(newCount)")
        logEvent("item_packages_updated", parameters: [
            "item_id": itemId,
            "delta": String(delta),
            "new_count": String(newCount)
        ])
    }

    func trackItemItemsUpdated(itemId: String, delta: Int, newCount: Int) {
        logger.info("Item items updated: \(itemId, privacy: .public), delta: \(delta), new count: \(newCount)")
        logEvent("item_items_updated", parameters: [
            "item_id": itemId,
            "delta": String(delta),
            "new_count": String(newCount)
        ])
    }

    // MARK: - Notifications
    func trackNotificationsEnabled() {
        logger.info("Notifications enabled")
        logEvent("notifications_enabled", parameters: [:])
    }

    // MARK: - Pairing
    func trackPairCreated(pairId: String) {
        logger.info("Shared freezer created: \(pairId, privacy: .public)")
        logEvent("pair_created", parameters: ["pair_id": pairId])
    }

    func trackPairJoined(pairId: String) {
        logger.info("Joined shared freezer: \(pairId, privacy: .public)")
        logEvent("pair_joined", parameters: ["pair_id": pairId])
    }

    // MARK: - Search & Filter Events

    func trackSearch(query: String, resultsCount: Int) {
        logger.info("Search performed: \(query, privacy: .public), results: \(resultsCount)")
        logEvent("search_performed", parameters: [
            "query": query,
            "results_count": String(resultsCount)
        ])
    }

    func trackShelfFilterApplied(shelfNumber: Int, resultsCount: Int) {
        logger.info("Shelf filter applied: \(shelfNumber), results: \(resultsCount)")
        logEvent("shelf_filter_applied", parameters: [
            "shelf_number": String(shelfNumber),
            "results_count": String(resultsCount)
        ])
    }

    func trackFilterCleared() {
        logger.info("Filter cleared")
        logEvent("filter_cleared", parameters: [:])
    }

    // MARK: - Private Methods

    private func logEvent(_ eventName: String, parameters: [String: String]) {
        // В будущем здесь можно добавить интеграцию с Firebase Analytics,
        // App Store Analytics, или другими платформами аналитики

        #if DEBUG
        print("📊 Analytics Event: \(eventName)")
        if !parameters.isEmpty {
            print("   Parameters: \(parameters)")
        }
        #endif

        let payload = APIClient.AnalyticsEventPayload(
            event: eventName,
            deviceId: keychain.deviceId,
            userId: keychain.userId,
            pairId: keychain.pairId,
            timestamp: Date(),
            properties: parameters.isEmpty ? nil : parameters
        )

        let token = keychain.authToken
        Task.detached {
            await self.apiClient.sendAnalyticsEvent(payload, token: token)
        }
    }
}
