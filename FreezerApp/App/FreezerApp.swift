import SwiftUI

@main
struct FreezerApp: App {
    @StateObject private var syncService = SyncService.shared
    @StateObject private var repository = DataRepository(syncService: .shared)
    @AppStorage("appLanguage") private var appLanguage: String = "ru"

    init() {
        AnalyticsService.shared.trackAppOpened()
        applyPreferredLanguage()

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

    private func applyPreferredLanguage() {
        let language = UserDefaults.standard.string(forKey: "appLanguage") ?? "ru"
        UserDefaults.standard.set([language], forKey: "AppleLanguages")
        UserDefaults.standard.synchronize()
    }

    private var languageLocale: Locale {
        Locale(identifier: appLanguage)
    }

    var body: some Scene {
        WindowGroup {
            CategoryListView()
                .environmentObject(repository)
                .environmentObject(syncService)
                .environment(\.locale, languageLocale)
                .id(appLanguage) // force view refresh on language change
        }
    }
}
