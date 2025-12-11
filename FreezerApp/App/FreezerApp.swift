import SwiftUI

@main
struct FreezerApp: App {
    @StateObject private var syncService = SyncService.shared
    @StateObject private var repository = DataRepository(syncService: .shared)

    init() {
        AnalyticsService.shared.trackAppOpened()

        // Миграция: выключаем уведомления по умолчанию для версии 0.4
        // Это выполнится один раз при обновлении
        let migrationKey = "v0.4_notifications_migration"
        if !UserDefaults.standard.bool(forKey: migrationKey) {
            // Если уведомления не были явно настроены пользователем, выключаем их
            let notificationsKey = "notificationsEnabled"
            // Проверяем, существует ли уже ключ (пользователь настроил)
            if UserDefaults.standard.object(forKey: notificationsKey) != nil {
                // Ключ существует, но мы всё равно устанавливаем в false для миграции
                UserDefaults.standard.set(false, forKey: notificationsKey)
            }
            // Отмечаем, что миграция выполнена
            UserDefaults.standard.set(true, forKey: migrationKey)
        }
    }

    var body: some Scene {
        WindowGroup {
            CategoryListView()
                .environmentObject(repository)
                .environmentObject(syncService)
        }
    }
}
