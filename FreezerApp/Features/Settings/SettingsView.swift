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
    @EnvironmentObject var syncService: SyncService
    @EnvironmentObject var authState: AuthState
    @Environment(\.dismiss) var dismiss

    @AppStorage("appLanguage") private var appLanguage: String = "ru"
    @State private var showExportPicker = false
    @State private var showImportPicker = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showImportConfirmation = false
    @State private var pendingBackup: BackupService.BackupData?
    @State private var exportedFileURL: URL?
    @State private var exportDocument: BackupDocument?
    @State private var showCreatePair = false
    @State private var showJoinPair = false
    @State private var showLeavePairConfirmation = false
    @State private var developerTapCount = 0
    @State private var developerOptionsVisible = false
    @AppStorage("appearanceMode") private var appearanceMode: String = AppearanceMode.system.rawValue
    @AppStorage("notificationsEnabled") private var notificationsEnabled: Bool = false
    @AppStorage("notificationDays") private var notificationDaysData: Data = try! JSONEncoder().encode([3, 7, 14])

    private let backupService = BackupService.shared
    private let notificationService = NotificationService.shared

    var body: some View {
        NavigationStack {
            List {
                backupSection
                appearanceSection
                notificationsSection
                if notificationsEnabled { notificationDaysSection }
                syncSection
                accountSection
                if FeatureFlags.is_icloud_sync_active { iCloudSection }
                statsSection
                appInfoSection
                #if DEBUG
                if developerOptionsVisible { developerToolsSection }
                #endif
                developerLinkSection
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
                    Text(
                        String(
                            format: NSLocalizedString(
                                "Будет импортировано %d групп и %d заготовок. Текущие данные будут заменены.",
                                comment: ""
                            ),
                            backup.categories.count,
                            backup.items.count
                        )
                    )
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
            .sheet(isPresented: $showCreatePair) {
                CreatePairView()
                    .environmentObject(syncService)
            }
            .sheet(isPresented: $showJoinPair) {
                JoinPairView()
                    .environmentObject(syncService)
            }
            .alert("Покинуть холодильник?", isPresented: $showLeavePairConfirmation) {
                Button("Отмена", role: .cancel) { }
                Button("Покинуть", role: .destructive) {
                    leavePair()
                }
            } message: {
                Text("Вы будете отключены от общего холодильника. Локальные данные останутся на устройстве.")
            }
            .preferredColorScheme(AppearanceMode(rawValue: appearanceMode)?.colorScheme)
            .onChange(of: appLanguage) { _, newValue in
                UserDefaults.standard.set([newValue], forKey: "AppleLanguages")
                UserDefaults.standard.synchronize()
            }
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private var backupSection: some View {
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
    }

    @ViewBuilder
    private var appearanceSection: some View {
        Section {
            Picker("Язык", selection: $appLanguage) {
                Text("Русский").tag("ru")
                Text("English").tag("en")
            }
            .pickerStyle(.segmented)

            Picker("Тема оформления", selection: $appearanceMode) {
                ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                    Text(mode.rawValue).tag(mode.rawValue)
                }
            }
            .pickerStyle(.menu)
        } header: {
            Text("Оформление")
        } footer: {
            Text("Выберите язык и тему оформления приложения")
        }
    }

    @ViewBuilder
    private var notificationsSection: some View {
        Section {
            Toggle("Уведомления о сроках", isOn: $notificationsEnabled)
                .font(Theme.Typography.body)
                .onChange(of: notificationsEnabled) { _, newValue in
                    if newValue {
                        requestNotificationPermission()
                        AnalyticsService.shared.trackNotificationsEnabled()
                    } else {
                        notificationService.removeAllPendingNotificationRequests()
                    }
                }
        } header: {
            Text("Уведомления")
        } footer: {
            Text("Получайте напоминания о заготовках, срок годности которых скоро истекает")
        }
    }

    @ViewBuilder
    private var notificationDaysSection: some View {
        Section {
            ForEach([3, 7, 14], id: \.self) { days in
                Toggle(
                    "\(days) \(daysWord(days))",
                    isOn: notificationToggleBinding(for: days)
                )
                .font(Theme.Typography.body)
            }
        } header: {
            Text("Напоминать за")
        } footer: {
            Text("Выберите, за сколько дней до истечения срока годности отправлять уведомление")
        }
    }

    @ViewBuilder
    private var pairActionButtons: some View {
        Button {
            showCreatePair = true
        } label: {
            HStack {
                Image(systemName: "plus.circle")
                    .foregroundColor(Theme.Colors.primary)
                    .frame(width: 24)
                Text("Создать общий холодильник")
                    .foregroundColor(Theme.Colors.textPrimary)
            }
        }

        Button {
            showJoinPair = true
        } label: {
            HStack {
                Image(systemName: "link")
                    .foregroundColor(Theme.Colors.primary)
                    .frame(width: 24)
                Text("Подключиться к холодильнику")
                    .foregroundColor(Theme.Colors.textPrimary)
            }
        }
    }

    @ViewBuilder
    private var syncSection: some View {
        Section {
            if syncService.currentPair != nil {
                HStack(spacing: 12) {
                    Image(systemName: syncService.syncStatus.iconName)
                        .foregroundColor(Color(syncService.syncStatus.iconColor))
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Статус синхронизации")
                            .foregroundColor(Theme.Colors.textPrimary)
                            .font(Theme.Typography.body)
                        Text(syncService.syncStatus.displayText)
                            .foregroundColor(Theme.Colors.textSecondary)
                            .font(Theme.Typography.caption)
                    }
                    Spacer()
                }

                Button {
                    Task {
                        await syncService.syncNow()
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 24)
                        Text("Синхронизировать вручную")
                            .foregroundColor(Theme.Colors.textPrimary)
                    }
                }

                if syncService.pairMode == "shared" {
                    Button(role: .destructive) {
                        showLeavePairConfirmation = true
                    } label: {
                        HStack {
                            Image(systemName: "xmark.circle")
                                .foregroundColor(.red)
                                .frame(width: 24)
                            Text("Покинуть холодильник")
                                .foregroundColor(.red)
                        }
                    }
                } else {
                    pairActionButtons
                }
            } else {
                pairActionButtons
            }
        } header: {
            Text("Синхронизация с партнером")
        } footer: {
            if syncService.currentPair != nil {
                Text("Ваши данные синхронизируются с партнером каждые 5 секунд")
            } else {
                Text("Создайте общий холодильник или подключитесь к существующему для синхронизации данных с партнером")
            }
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        Section {
            Button(role: .destructive) {
                Task {
                    await authState.logout(syncService: syncService, repository: repository)
                    dismiss()
                }
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(.red)
                        .frame(width: 24)
                    Text("Выйти из аккаунта")
                        .foregroundColor(.red)
                }
            }
        } header: {
            Text("Аккаунт")
        } footer: {
            Text("Выход очистит локальные данные и вернет на экран входа")
        }
    }

    @ViewBuilder
    private var iCloudSection: some View {
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
            Text("Локальная синхронизация")
        } footer: {
            Text("При включенной синхронизации iCloud ваши данные автоматически синхронизируются между всеми устройствами, подключенными к одному Apple ID")
        }
    }

    @ViewBuilder
    private var statsSection: some View {
        Section {
            HStack {
                Text("Групп")
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
    }

    @ViewBuilder
    private var appInfoSection: some View {
        Section {
            VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                HStack {
                    Text("Версия")
                        .foregroundColor(Theme.Colors.textPrimary)
                    Spacer()
                    Text(appVersion)
                        .foregroundColor(Theme.Colors.textSecondary)
                        .font(Theme.Typography.callout)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    #if DEBUG
                    if !developerOptionsVisible {
                        developerTapCount += 1
                        if developerTapCount >= 5 {
                            developerOptionsVisible = true
                            developerTapCount = 0
                        }
                    }
                    #endif
                }

                Button {
                    if let url = URL(string: "mailto:ceo@moone.dev") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    HStack {
                        Text("Написать в поддержку")
                            .foregroundColor(Theme.Colors.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(Theme.Colors.textSecondary)
                    }
                }
            }
            .padding(.vertical, Theme.Spacing.xs)
        } header: {
            Text("О приложении")
        }
    }

    @ViewBuilder
    private var developerToolsSection: some View {
        Section {
            Button(role: .destructive) {
                KeychainService.shared.clearEverything()
                syncService.currentPair = nil
                errorMessage = "Все данные синхронизации удалены. Перезапустите приложение."
                showError = true
            } label: {
                HStack {
                    Image(systemName: "trash.circle")
                        .foregroundColor(.red)
                        .frame(width: 24)
                    Text("Очистить данные синхронизации")
                        .foregroundColor(.red)
                }
            }

            Button {
                errorMessage = debugInfoString
                showError = true
            } label: {
                HStack {
                    Image(systemName: "info.circle")
                        .foregroundColor(Theme.Colors.primary)
                        .frame(width: 24)
                    Text("Показать debug info")
                        .foregroundColor(Theme.Colors.textPrimary)
                }
            }

            Button {
                UIPasteboard.general.string = debugInfoString
            } label: {
                HStack {
                    Image(systemName: "doc.on.doc")
                        .foregroundColor(Theme.Colors.primary)
                        .frame(width: 24)
                    Text("Скопировать debug info")
                        .foregroundColor(Theme.Colors.textPrimary)
                }
            }

            #if DEBUG
            Button {
                repository.addDemoData()
            } label: {
                HStack {
                    Image(systemName: "shippingbox.fill")
                        .foregroundColor(Theme.Colors.primary)
                        .frame(width: 24)
                    Text("Добавить демо данные")
                        .foregroundColor(Theme.Colors.textPrimary)
                }
            }
            #endif
        } header: {
            Text("Инструменты разработчика")
        } footer: {
            Text("Чтобы скрыть, перезапустите приложение")
        }
    }

    @ViewBuilder
    private var developerLinkSection: some View {
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

    // MARK: - Export

    private func exportData() {
        print("📤 Starting export...")
        print("📊 Groups: \(repository.categories.count), Items: \(repository.items.count)")

        do {
            let data = try backupService.exportData(
                categories: repository.categories,
                items: repository.items
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
        repository.replaceAllData(categories: backup.categories, items: backup.items)

        pendingBackup = nil
        dismiss()
    }

    // MARK: - Helpers

    private var debugInfoString: String {
        let deviceId = KeychainService.shared.deviceId
        let pairId = KeychainService.shared.pairId ?? "nil"
        let token = KeychainService.shared.authToken ?? "nil"
        return "DeviceID: \(deviceId)\nPairID: \(pairId)\nToken: \(String(token.prefix(20)))..."
    }

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
        russianPlural(count, one: "день", few: "дня", many: "дней")
    }

    private func notificationToggleBinding(for days: Int) -> Binding<Bool> {
        Binding(
            get: { notificationDays.contains(days) },
            set: { isOn in
                var updated = notificationDays
                if isOn {
                    if !updated.contains(days) {
                        updated.append(days)
                        updated.sort()
                    }
                } else {
                    updated.removeAll { $0 == days }
                }
                updateNotificationDays(updated)
            }
        )
    }

    // MARK: - Sync

    private func leavePair() {
        Task {
            do {
                try await syncService.leavePair()
            } catch {
                errorMessage = "Не удалось покинуть холодильник: \(error.localizedDescription)"
                showError = true
            }
        }
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
