import Foundation
import UserNotifications
import OSLog

/// Сервис для управления уведомлениями о сроках годности
final class NotificationService: NSObject {
    static let shared = NotificationService()

    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "Notifications")
    private let center = UNUserNotificationCenter.current()

    // Настройки уведомлений из UserDefaults
    @UserDefaultsBacked(key: "notificationsEnabled", defaultValue: true)
    var isEnabled: Bool

    @UserDefaultsBacked(key: "notificationDays", defaultValue: [3, 7, 14])
    var notificationDays: [Int]

    private override init() {
        super.init()
        center.delegate = self
    }

    // MARK: - Authorization

    /// Запрос разрешения на уведомления
    func requestAuthorization() async throws -> Bool {
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        let granted = try await center.requestAuthorization(options: options)

        if granted {
            logger.info("Notifications authorized")
        } else {
            logger.warning("Notifications not authorized")
        }

        return granted
    }

    /// Проверка текущего статуса разрешений
    func checkAuthorizationStatus() async -> UNAuthorizationStatus {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus
    }

    // MARK: - Schedule Notifications

    /// Планирование уведомлений для всех заготовок
    func scheduleNotifications(for items: [Item]) async {
        guard isEnabled else {
            logger.info("Notifications disabled, skipping scheduling")
            return
        }

        // Проверяем разрешение
        let status = await checkAuthorizationStatus()
        guard status == .authorized else {
            logger.warning("Notifications not authorized, status: \(String(describing: status))")
            return
        }

        // Удаляем все старые уведомления
        center.removeAllPendingNotificationRequests()

        // Создаем уведомления для каждой заготовки
        for item in items {
            for days in notificationDays {
                scheduleNotification(for: item, daysBeforeExpiration: days)
            }
        }

        logger.info("Scheduled notifications for \(items.count) items")
    }

    /// Планирование уведомления для конкретной заготовки
    private func scheduleNotification(for item: Item, daysBeforeExpiration: Int) {
        let notificationDate = Calendar.current.date(
            byAdding: .day,
            value: -daysBeforeExpiration,
            to: item.expirationDate
        )

        guard let notificationDate = notificationDate,
              notificationDate > Date() else {
            return // Уведомление в прошлом, пропускаем
        }

        let content = UNMutableNotificationContent()
        content.title = "Скоро истекает срок"
        content.body = "\(item.name) истекает через \(daysBeforeExpiration) \(daysWord(daysBeforeExpiration))"
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = "EXPIRATION_REMINDER"
        content.userInfo = ["itemId": item.id]

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: notificationDate
        )

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: components,
            repeats: false
        )

        let identifier = "\(item.id)-\(daysBeforeExpiration)"
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                self.logger.error("Failed to schedule notification: \(error.localizedDescription)")
            }
        }
    }

    /// Отмена уведомлений для конкретной заготовки
    func cancelNotifications(for itemId: String) {
        let identifiers = notificationDays.map { "\(itemId)-\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
        logger.info("Cancelled notifications for item: \(itemId)")
    }

    /// Отмена всех запланированных уведомлений
    func removeAllPendingNotificationRequests() {
        center.removeAllPendingNotificationRequests()
        logger.info("Cancelled all pending notifications")
    }

    // MARK: - Badge Management

    /// Обновление счетчика бейджа
    func updateBadgeCount(expiringItemsCount: Int) {
        UNUserNotificationCenter.current().setBadgeCount(expiringItemsCount) { error in
            if let error = error {
                self.logger.error("Failed to update badge: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Helpers

    private func daysWord(_ count: Int) -> String {
        if count % 10 == 1 && count % 100 != 11 { return "день" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "дня" }
        return "дней"
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationService: UNUserNotificationCenterDelegate {
    /// Обработка уведомления когда приложение на переднем плане
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    /// Обработка нажатия на уведомление
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let itemId = response.notification.request.content.userInfo["itemId"] as? String
        logger.info("User tapped notification for item: \(itemId ?? "unknown")")

        // Здесь можно добавить навигацию к конкретной заготовке

        completionHandler()
    }
}

// MARK: - UserDefaults Property Wrapper

@propertyWrapper
struct UserDefaultsBacked<T: Codable> {
    let key: String
    let defaultValue: T

    var wrappedValue: T {
        get {
            guard let data = UserDefaults.standard.data(forKey: key) else {
                return defaultValue
            }
            let value = try? JSONDecoder().decode(T.self, from: data)
            return value ?? defaultValue
        }
        set {
            let data = try? JSONEncoder().encode(newValue)
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
