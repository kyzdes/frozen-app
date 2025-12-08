import SwiftUI
import UIKit

@main
struct FreezerApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var repository = DataRepository()

    init() {
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

        configureFrameRate()
    }

    var body: some Scene {
        WindowGroup {
            CategoryListView()
                .environmentObject(repository)
                .onChange(of: scenePhase) { newPhase in
                    if newPhase == .active {
                        configureFrameRate()
                    }
                }
        }
    }
}

// MARK: - ProMotion Support

private func configureFrameRate() {
    guard #available(iOS 15.0, *) else { return }
    let preferredRange = CAFrameRateRange(minimum: 80, maximum: 120, preferred: 120)
    UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .forEach { $0.preferredFrameRateRange = preferredRange }
}
