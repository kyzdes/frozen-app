import SwiftUI
import UIKit
import UniformTypeIdentifiers

enum AppearanceMode: String, CaseIterable {
    case system = "Системная"
    case light = "Светлая"
    case dark = "Темная"

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var repository: DataRepository
    @Environment(\.dismiss) var dismiss

    @State private var showExportPicker = false
    @State private var showImportPicker = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showImportConfirmation = false
    @State private var pendingBackup: BackupService.BackupData?
    @State private var exportedFileURL: URL?
    @State private var exportDocument: BackupDocument?
    @AppStorage("appearanceMode") private var appearanceMode: String = AppearanceMode.system.rawValue
    @AppStorage("notificationsEnabled") private var notificationsEnabled: Bool = false
    @AppStorage("notificationDaysData") private var notificationDaysData: Data = try! JSONEncoder().encode([3, 7, 14])

    private let backupService = BackupService.shared
    private let notificationService = NotificationService.shared

    var body: some View {
        NavigationStack {
            List {
                // MARK: - Backup Section
                Section {
                    Button {
                        exportData()
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(Theme.Colors.primary)
                                .frame(width: 24)
                            Text("Экспортировать данные")
                                .foregroundColor(Theme.Colors.textPrimary)
                        }
                    }

                    Button {
                        showImportPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.down")
                                .foregroundColor(Theme.Colors.primary)
                                .frame(width: 24)
                            Text("Импортировать данные")
                                .foregroundColor(Theme.Colors.textPrimary)
                        }
                    }
                } header: {
                    Text("Резервное копирование")
                } footer: {
                    Text("Экспортируйте данные для сохранения резервной копии или переноса на другое устройство")
                }

                // MARK: - Appearance Section
                Section {
                    Picker("Тема оформления", selection: $appearanceMode) {
                        ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                            Text(mode.rawValue).tag(mode.rawValue)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text("Оформление")
                } footer: {
                    Text("Выберите тему оформления приложения")
                }

                // MARK: - Notifications Section
                Section {
                    Toggle("Уведомления о сроках", isOn: $notificationsEnabled)
                        .font(Theme.Typography.body)
                        .onChange(of: notificationsEnabled) { _, newValue in
                            if newValue {
                                requestNotificationPermission()
                            } else {
                                notificationService.removeAllPendingNotificationRequests()
                            }
                        }

                    if notificationsEnabled {
                        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                            Text("Напоминать за:")
                                .font(Theme.Typography.subheadline)
                                .foregroundColor(Theme.Colors.textSecondary)

                            VStack(spacing: Theme.Spacing.md) {
                                ForEach([3, 7, 14], id: \.self) { days in
                                    Toggle("\(days) \(daysWord(days))", isOn: Binding(
                                        get: { notificationDays.contains(days) },
                                        set: { isOn in
                                            if isOn {
                                                var updated = notificationDays
                                                if !updated.contains(days) {
                                                    updated.append(days)
                                                    updated.sort()
                                                    updateNotificationDays(updated)
                                                }
                                            } else {
                                                var updated = notificationDays
                                                updated.removeAll { $0 == days }
                                                updateNotificationDays(updated)
                                            }
                                        }
                                    ))
                                    .font(Theme.Typography.body)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Уведомления")
                } footer: {
                    Text("Получайте напоминания о заготовках, срок годности которых скоро истекает")
                }

                // MARK: - iCloud Section
                Section {
                    HStack {
                        Image(systemName: "icloud")
                            .foregroundColor(backupService.checkiCloudStatus() ? Theme.Colors.success : Theme.Colors.textSecondary)
                            .frame(width: 24)
                        Text("Синхронизация iCloud")
                            .foregroundColor(Theme.Colors.textPrimary)
                        Spacer()
                        Text(backupService.checkiCloudStatus() ? "Включена" : "Выключена")
                            .foregroundColor(Theme.Colors.textSecondary)
                            .font(Theme.Typography.callout)
                    }
                } header: {
                    Text("Синхронизация")
                } footer: {
                    Text("При включенной синхронизации iCloud ваши данные автоматически синхронизируются между всеми устройствами, подключенными к одному Apple ID")
                }

                // MARK: - Data Section
                Section {
                    HStack {
                        Text("Категорий")
                            .foregroundColor(Theme.Colors.textPrimary)
                        Spacer()
                        Text("\(repository.categories.count)")
                            .foregroundColor(Theme.Colors.textSecondary)
                            .font(Theme.Typography.callout)
                    }

                    HStack {
                        Text("Заготовок")
                            .foregroundColor(Theme.Colors.textPrimary)
                        Spacer()
                        Text("\(repository.items.count)")
                            .foregroundColor(Theme.Colors.textSecondary)
                            .font(Theme.Typography.callout)
                    }
                } header: {
                    Text("Статистика")
                }

                // MARK: - App Info
                Section {
                    HStack {
                        Text("Версия")
                            .foregroundColor(Theme.Colors.textPrimary)
                        Spacer()
                        Text(appVersion)
                            .foregroundColor(Theme.Colors.textSecondary)
                            .font(Theme.Typography.callout)
                    }
                } header: {
                    Text("О приложении")
                }

                // MARK: - Developer Section
                Section {
                    Link(destination: URL(string: "https://productowner.me")!) {
                        HStack {
                            Spacer()
                            Text("ПРОДУКТОВНЕР")
                                .font(Theme.Typography.callout)
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.Colors.primary)
                            Spacer()
                        }
                        .padding(.vertical, Theme.Spacing.sm)
                    }
                }
                .listRowBackground(Color.clear)
            }
            .navigationTitle("Настройки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Готово") {
                        dismiss()
                    }
                }
            }
            .alert("Ошибка", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
            .alert("Импорт данных", isPresented: $showImportConfirmation) {
                Button("Отмена", role: .cancel) {
                    pendingBackup = nil
                }
                Button("Заменить", role: .destructive) {
                    if let backup = pendingBackup {
                        importBackup(backup)
                    }
                }
            } message: {
                if let backup = pendingBackup {
                    Text("Будет импортировано \(backup.categories.count) категорий и \(backup.items.count) заготовок. Текущие данные будут заменены.")
                }
            }
            .fileExporter(
                isPresented: $showExportPicker,
                document: exportDocument,
                contentType: .json,
                defaultFilename: "freezer_backup_\(Date().ISO8601Format()).json"
            ) { result in
                switch result {
                case .success(let url):
                    print("✅ File saved to: \(url.path)")
                case .failure(let error):
                    print("❌ Save failed: \(error)")
                    errorMessage = "Не удалось сохранить файл: \(error.localizedDescription)"
                    showError = true
                }
            }
            .fileImporter(
                isPresented: $showImportPicker,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                handleImport(result)
            }
            .preferredColorScheme(AppearanceMode(rawValue: appearanceMode)?.colorScheme)
        }
    }

    // MARK: - Export

    private func exportData() {
        print("📤 Starting export...")
        print("📊 Categories: \(repository.categories.count), Items: \(repository.items.count)")

        do {
            let data = try backupService.exportData(
                categories: repository.categories,
                items: repository.items,
                history: repository.history
            )
            print("✅ Export data created, size: \(data.count) bytes")
            exportDocument = BackupDocument(data: data)
            showExportPicker = true
            print("🎉 Showing file exporter...")
        } catch {
            print("❌ Export failed: \(error)")
            errorMessage = "Не удалось экспортировать данные: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Import

    private func handleImport(_ result: Result<[URL], Error>) {
        do {
            guard let url = try result.get().first else { return }

            let backup = try backupService.importData(from: url)

            // Validate backup
            let validation = backupService.validateBackup(backup)
            guard validation.isValid else {
                if case .invalid(let issues) = validation {
                    errorMessage = "Некорректные данные:\n" + issues.joined(separator: "\n")
                    showError = true
                }
                return
            }

            // Show confirmation dialog
            pendingBackup = backup
            showImportConfirmation = true

        } catch {
            errorMessage = "Не удалось импортировать данные: \(error.localizedDescription)"
            showError = true
        }
    }

    private func importBackup(_ backup: BackupService.BackupData) {
        // Replace all data
        repository.replaceAllData(categories: backup.categories, items: backup.items, history: backup.history)

        pendingBackup = nil
        dismiss()
    }

    // MARK: - Helpers

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }

    // MARK: - Notifications

    private var notificationDays: [Int] {
        guard let days = try? JSONDecoder().decode([Int].self, from: notificationDaysData) else {
            return [3, 7, 14]
        }
        return days
    }

    private func updateNotificationDays(_ days: [Int]) {
        guard let data = try? JSONEncoder().encode(days) else { return }
        notificationDaysData = data
        notificationService.notificationDays = days

        // Обновляем уведомления
        Task {
            await notificationService.scheduleNotifications(for: repository.items)
        }
    }

    private func requestNotificationPermission() {
        Task {
            do {
                let granted = try await notificationService.requestAuthorization()
                if granted {
                    await notificationService.scheduleNotifications(for: repository.items)
                } else {
                    notificationsEnabled = false
                    errorMessage = "Разрешите уведомления в настройках iOS"
                    showError = true
                }
            } catch {
                errorMessage = "Не удалось запросить разрешение на уведомления"
                showError = true
            }
        }
    }

    private func daysWord(_ count: Int) -> String {
        if count % 10 == 1 && count % 100 != 11 { return "день" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "дня" }
        return "дней"
    }
}

// MARK: - Backup Document

struct BackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.data = data
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        return FileWrapper(regularFileWithContents: data)
    }
}
