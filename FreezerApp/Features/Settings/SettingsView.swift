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

/// Gradient-filled rounded icon tile used on settings rows (Arctic Frost).
private struct SettingsRowIcon: View {
    let system: String
    let colors: [Color]

    var body: some View {
        Image(systemName: system)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 30, height: 30)
            .background(
                LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 8, style: .continuous)
            )
    }
}

struct SettingsView: View {
    @EnvironmentObject var repository: DataRepository
    @EnvironmentObject var syncService: SyncService
    @EnvironmentObject var authState: AuthState

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

    private var rowBackground: some View { Rectangle().fill(.ultraThinMaterial) }

    var body: some View {
        ZStack {
            ArcticBackdrop()

            List {
                syncSection.listRowBackground(rowBackground)
                notificationsSection.listRowBackground(rowBackground)
                if notificationsEnabled { notificationDaysSection.listRowBackground(rowBackground) }
                appearanceSection.listRowBackground(rowBackground)
                backupSection.listRowBackground(rowBackground)
                accountSection.listRowBackground(rowBackground)
                if FeatureFlags.is_icloud_sync_active { iCloudSection.listRowBackground(rowBackground) }
                statsSection.listRowBackground(rowBackground)
                appInfoSection.listRowBackground(rowBackground)
                #if DEBUG
                if developerOptionsVisible { developerToolsSection.listRowBackground(rowBackground) }
                #endif
                developerLinkSection
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .tint(AF.Color.accent)
        }
        .navigationTitle("Настройки")
        .navigationBarTitleDisplayMode(.large)
        .alert("Ошибка", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
        .alert("Импорт данных", isPresented: $showImportConfirmation) {
            Button("Отмена", role: .cancel) { pendingBackup = nil }
            Button("Заменить", role: .destructive) {
                if let backup = pendingBackup { importBackup(backup) }
            }
        } message: {
            if let backup = pendingBackup {
                Text(String(
                    format: NSLocalizedString("Будет импортировано %d групп и %d заготовок. Текущие данные будут заменены.", comment: ""),
                    backup.categories.count, backup.items.count
                ))
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
            CreatePairView().environmentObject(syncService)
        }
        .sheet(isPresented: $showJoinPair) {
            JoinPairView().environmentObject(syncService)
        }
        .alert("Покинуть холодильник?", isPresented: $showLeavePairConfirmation) {
            Button("Отмена", role: .cancel) { }
            Button("Покинуть", role: .destructive) { leavePair() }
        } message: {
            Text("Вы будете отключены от общего холодильника. Локальные данные останутся на устройстве.")
        }
        .onChange(of: appLanguage) { _, newValue in
            UserDefaults.standard.set([newValue], forKey: "AppleLanguages")
            UserDefaults.standard.synchronize()
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private var backupSection: some View {
        Section {
            Button {
                exportData()
            } label: {
                rowLabel("Экспортировать данные", icon: "square.and.arrow.up", colors: [Color(hex: "#0E9E8E"), Color(hex: "#36C5B8")])
            }
            Button {
                showImportPicker = true
            } label: {
                rowLabel("Импортировать данные", icon: "square.and.arrow.down", colors: [Color(hex: "#8E7BE6"), Color(hex: "#A594EC")])
            }
        } header: {
            Text("Резервные копии")
        } footer: {
            Text("Экспортируйте данные для сохранения резервной копии или переноса на другое устройство")
        }
    }

    @ViewBuilder
    private var appearanceSection: some View {
        Section {
            HStack {
                SettingsRowIcon(system: "globe", colors: [Color(hex: "#3098D4"), Color(hex: "#36C5D8")])
                Text("Язык").foregroundStyle(AF.Color.textPrimary)
                Spacer()
                Picker("", selection: $appLanguage) {
                    Text("Русский").tag("ru")
                    Text("English").tag("en")
                }
                .pickerStyle(.segmented)
                .fixedSize()
            }

            Picker(selection: $appearanceMode) {
                ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                    Text(mode.rawValue).tag(mode.rawValue)
                }
            } label: {
                HStack {
                    SettingsRowIcon(system: "circle.lefthalf.filled", colors: [Color(hex: "#5B7CE0"), Color(hex: "#7E9BE6")])
                    Text("Тема оформления").foregroundStyle(AF.Color.textPrimary)
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
            Toggle(isOn: $notificationsEnabled) {
                HStack {
                    SettingsRowIcon(system: "bell.fill", colors: [Color(hex: "#E0A24E"), Color(hex: "#E8B566")])
                    Text("Уведомления о сроках").foregroundStyle(AF.Color.textPrimary)
                }
            }
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
                Toggle("\(days) \(daysWord(days))", isOn: notificationToggleBinding(for: days))
                    .foregroundStyle(AF.Color.textPrimary)
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
            rowLabel("Создать общий холодильник", icon: "plus", colors: [Color(hex: "#3098D4"), Color(hex: "#36C5D8")], chevron: true)
        }
        Button {
            showJoinPair = true
        } label: {
            rowLabel("Подключиться к холодильнику", icon: "link", colors: [Color(hex: "#5B7CE0"), Color(hex: "#7E9BE6")], chevron: true)
        }
    }

    @ViewBuilder
    private var syncSection: some View {
        Section {
            if syncService.currentPair != nil {
                HStack(spacing: AF.Space.m) {
                    SettingsRowIcon(system: "checkmark.shield.fill", colors: [Color(hex: "#0E9E8E"), Color(hex: "#36C5B8")])
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Статус синхронизации")
                            .foregroundStyle(AF.Color.textPrimary)
                            .font(AF.Typography.body)
                        Text(syncService.syncStatus.displayText)
                            .foregroundStyle(AF.Color.textTertiary)
                            .font(AF.Typography.caption)
                    }
                    Spacer()
                    Image(systemName: syncService.syncStatus.iconName)
                        .foregroundStyle(Color(syncService.syncStatus.iconColor))
                }

                Button {
                    Task { await syncService.syncNow() }
                } label: {
                    rowLabel("Синхронизировать вручную", icon: "arrow.triangle.2.circlepath", colors: [Color(hex: "#3098D4"), Color(hex: "#36C5D8")])
                }

                if syncService.pairMode == "shared" {
                    Button(role: .destructive) {
                        showLeavePairConfirmation = true
                    } label: {
                        rowLabel("Покинуть холодильник", icon: "xmark", colors: [Color(hex: "#FF7D97"), Color(hex: "#E23B5E")], destructive: true)
                    }
                } else {
                    pairActionButtons
                }
            } else {
                pairActionButtons
            }
        } header: {
            Text("Синхронизация с партнёром")
        } footer: {
            if syncService.currentPair != nil {
                Text("Ваши данные синхронизируются с партнёром каждые 5 секунд")
            } else {
                Text("Создайте общий холодильник или подключитесь к существующему для синхронизации данных с партнёром")
            }
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        Section {
            Button(role: .destructive) {
                Task { await authState.logout(syncService: syncService, repository: repository) }
            } label: {
                rowLabel("Выйти из аккаунта", icon: "rectangle.portrait.and.arrow.right", colors: [Color(hex: "#FF7D97"), Color(hex: "#E23B5E")], destructive: true)
            }
        } header: {
            Text("Аккаунт")
        } footer: {
            Text("Выход очистит локальные данные и вернёт на экран входа")
        }
    }

    @ViewBuilder
    private var iCloudSection: some View {
        Section {
            HStack {
                SettingsRowIcon(system: "icloud.fill", colors: [Color(hex: "#3098D4"), Color(hex: "#36C5D8")])
                Text("Синхронизация iCloud").foregroundStyle(AF.Color.textPrimary)
                Spacer()
                Text(backupService.checkiCloudStatus() ? "Включена" : "Выключена")
                    .foregroundStyle(AF.Color.textTertiary)
                    .font(AF.Typography.callout)
            }
        } header: {
            Text("Локальная синхронизация")
        } footer: {
            Text("При включённой синхронизации iCloud ваши данные автоматически синхронизируются между всеми устройствами, подключёнными к одному Apple ID")
        }
    }

    @ViewBuilder
    private var statsSection: some View {
        Section {
            HStack {
                Text("Групп").foregroundStyle(AF.Color.textPrimary)
                Spacer()
                Text("\(repository.categories.count)")
                    .foregroundStyle(AF.Color.textTertiary)
                    .font(AF.Typography.callout)
            }
            HStack {
                Text("Заготовок").foregroundStyle(AF.Color.textPrimary)
                Spacer()
                Text("\(repository.items.count)")
                    .foregroundStyle(AF.Color.textTertiary)
                    .font(AF.Typography.callout)
            }
        } header: {
            Text("Статистика")
        }
    }

    @ViewBuilder
    private var appInfoSection: some View {
        Section {
            HStack {
                Text("Версия").foregroundStyle(AF.Color.textPrimary)
                Spacer()
                Text(appVersion)
                    .foregroundStyle(AF.Color.textTertiary)
                    .font(AF.Typography.callout)
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
                    Text("Написать в поддержку").foregroundStyle(AF.Color.accent)
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(AF.Color.textTertiary)
                }
            }
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
                rowLabel("Очистить данные синхронизации", icon: "trash", colors: [Color(hex: "#FF7D97"), Color(hex: "#E23B5E")], destructive: true)
            }

            Button {
                errorMessage = debugInfoString
                showError = true
            } label: {
                rowLabel("Показать debug info", icon: "info.circle", colors: [Color(hex: "#3098D4"), Color(hex: "#36C5D8")])
            }

            Button {
                UIPasteboard.general.string = debugInfoString
            } label: {
                rowLabel("Скопировать debug info", icon: "doc.on.doc", colors: [Color(hex: "#5B7CE0"), Color(hex: "#7E9BE6")])
            }

            #if DEBUG
            Button {
                repository.addDemoData()
            } label: {
                rowLabel("Добавить демо данные", icon: "shippingbox.fill", colors: [Color(hex: "#0E9E8E"), Color(hex: "#36C5B8")])
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
                        .font(AF.Typography.callout)
                        .fontWeight(.semibold)
                        .foregroundStyle(AF.Color.accent)
                    Spacer()
                }
                .padding(.vertical, AF.Space.s)
            }
        }
        .listRowBackground(Color.clear)
    }

    // MARK: - Row label helper

    private func rowLabel(_ title: String, icon: String, colors: [Color], chevron: Bool = false, destructive: Bool = false) -> some View {
        HStack(spacing: AF.Space.m) {
            SettingsRowIcon(system: icon, colors: colors)
            Text(title).foregroundStyle(destructive ? AF.Color.danger : AF.Color.textPrimary)
            Spacer()
            if chevron {
                Image(systemName: "chevron.right").foregroundStyle(AF.Color.textTertiary).font(.system(size: 14, weight: .semibold))
            }
        }
    }

    // MARK: - Export

    private func exportData() {
        do {
            let data = try backupService.exportData(categories: repository.categories, items: repository.items)
            exportDocument = BackupDocument(data: data)
            showExportPicker = true
        } catch {
            errorMessage = "Не удалось экспортировать данные: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Import

    private func handleImport(_ result: Result<[URL], Error>) {
        do {
            guard let url = try result.get().first else { return }
            let backup = try backupService.importData(from: url)
            let validation = backupService.validateBackup(backup)
            guard validation.isValid else {
                if case .invalid(let issues) = validation {
                    errorMessage = "Некорректные данные:\n" + issues.joined(separator: "\n")
                    showError = true
                }
                return
            }
            pendingBackup = backup
            showImportConfirmation = true
        } catch {
            errorMessage = "Не удалось импортировать данные: \(error.localizedDescription)"
            showError = true
        }
    }

    private func importBackup(_ backup: BackupService.BackupData) {
        repository.replaceAllData(categories: backup.categories, items: backup.items)
        pendingBackup = nil
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
        guard let days = try? JSONDecoder().decode([Int].self, from: notificationDaysData) else { return [3, 7, 14] }
        return days
    }

    private func updateNotificationDays(_ days: [Int]) {
        guard let data = try? JSONEncoder().encode(days) else { return }
        notificationDaysData = data
        notificationService.notificationDays = days
        Task { await notificationService.scheduleNotifications(for: repository.items) }
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
                    if !updated.contains(days) { updated.append(days); updated.sort() }
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

    init(data: Data) { self.data = data }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.data = data
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}
