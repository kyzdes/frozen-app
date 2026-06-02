import SwiftUI
import Combine

@MainActor
final class AuthState: ObservableObject {
    @Published var isAuthenticated: Bool = KeychainService.shared.isAuthenticated
    @Published var isChecking: Bool = true
    @Published var errorMessage: String?

    func bootstrap(syncService: SyncService) async {
        if !KeychainService.shared.isAuthenticated {
            isAuthenticated = false
            isChecking = false
            return
        }

        do {
            let me = try await APIClient.shared.me()
            syncService.applyAuthContext(user: me.user, pairContext: me.pairContext)
            isAuthenticated = true
        } catch {
            KeychainService.shared.clearAllData()
            syncService.clearSession()
            isAuthenticated = false
        }

        isChecking = false
    }

    func login(email: String, password: String, syncService: SyncService, repository: DataRepository) async {
        errorMessage = nil

        do {
            let response = try await APIClient.shared.login(email: email, password: password)
            repository.clearAllLocalData()
            syncService.applyAuthContext(user: response.user, pairContext: response.pairContext)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }
    }

    func register(name: String, email: String, password: String, syncService: SyncService, repository: DataRepository) async {
        errorMessage = nil

        do {
            let response = try await APIClient.shared.register(name: name, email: email, password: password)
            repository.clearAllLocalData()
            syncService.applyAuthContext(user: response.user, pairContext: response.pairContext)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }
    }

    func logout(syncService: SyncService, repository: DataRepository) async {
        errorMessage = nil
        await APIClient.shared.logout()
        syncService.clearSession()
        repository.clearAllLocalData()
        isAuthenticated = false
    }
}

struct AuthGateView: View {
    @EnvironmentObject private var authState: AuthState
    @EnvironmentObject private var syncService: SyncService
    @EnvironmentObject private var repository: DataRepository

    @State private var mode: Mode = .login
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false

    enum Mode {
        case login
        case register
    }

    var body: some View {
        ZStack {
            ArcticBackdrop()

            ScrollView {
                VStack(spacing: AF.Space.xxl) {
                    // Brand logo
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .fill(AF.Color.accent.opacity(0.18))
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .frame(width: 92, height: 92)
                        .overlay(
                            Text("❄️").font(.system(size: 46))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .strokeBorder(AF.Color.frostEdge, lineWidth: 0.5)
                        )
                        .shadow(color: AF.Color.accent.opacity(0.4), radius: 22, x: 0, y: 12)

                    VStack(spacing: 6) {
                        Text("Морозилка")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(AF.Color.textPrimary)
                        Text(mode == .login ? "Войдите, чтобы открыть холодильник" : "Создайте аккаунт за 30 секунд")
                            .font(AF.Typography.subheadline)
                            .foregroundStyle(AF.Color.textSecondary)
                            .multilineTextAlignment(.center)
                    }

                    // Login / register segmented
                    HStack(spacing: 2) {
                        authTab("Вход", active: mode == .login) { mode = .login }
                        authTab("Регистрация", active: mode == .register) { mode = .register }
                    }
                    .padding(2)
                    .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))

                    // Fields
                    VStack(spacing: 0) {
                        if mode == .register {
                            authField(label: "Имя") {
                                placeholder("Ваше имя", isShown: name.isEmpty)
                                TextField("", text: $name)
                                    .textInputAutocapitalization(.words)
                                    .autocorrectionDisabled()
                            }
                            Divider().overlay(AF.Color.hairline)
                        }
                        authField(label: "Email") {
                            placeholder("you@example.com", isShown: email.isEmpty)
                            TextField("", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        Divider().overlay(AF.Color.hairline)
                        authField(label: "Пароль") {
                            placeholder("Минимум 8 символов", isShown: password.isEmpty)
                            SecureField("", text: $password)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                    }
                    .afGroup()

                    Button {
                        submit()
                    } label: {
                        if isSubmitting {
                            ProgressView().tint(AF.Color.onAccent)
                        } else {
                            Text(mode == .login ? "Войти" : "Создать аккаунт")
                        }
                    }
                    .buttonStyle(AFPrimaryButtonStyle())
                    .disabled(isSubmitting)

                    if let errorMessage = authState.errorMessage {
                        Text(errorMessage)
                            .font(AF.Typography.footnote)
                            .foregroundStyle(AF.Color.danger)
                            .multilineTextAlignment(.center)
                    }

                    Text("Данные хранятся локально и синхронизируются между устройствами")
                        .font(AF.Typography.caption)
                        .foregroundStyle(AF.Color.textQuaternary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, AF.Space.xxl)
                .padding(.vertical, 48)
                .frame(maxWidth: .infinity, minHeight: 600)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
    }

    private func authTab(_ title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(AF.Typography.callout)
                .fontWeight(.medium)
                .foregroundStyle(active ? AF.Color.textPrimary : AF.Color.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background {
                    if active {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(.thickMaterial)
                            .shadow(color: AF.Color.shadowSoft, radius: 3, x: 0, y: 1)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func authField<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(AF.Typography.footnote)
                .foregroundStyle(AF.Color.textSecondary)
            ZStack(alignment: .leading) {
                content()
            }
            .font(AF.Typography.body)
            .foregroundStyle(AF.Color.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, AF.Space.l)
        .padding(.vertical, AF.Space.m)
    }

    private func placeholder(_ text: String, isShown: Bool) -> some View {
        Text(text)
            .foregroundStyle(AF.Color.textQuaternary)
            .opacity(isShown ? 1 : 0)
            .allowsHitTesting(false)
    }

    private func submit() {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !password.isEmpty else {
            authState.errorMessage = "Введите email и пароль"
            return
        }

        if mode == .register && name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            authState.errorMessage = "Введите имя"
            return
        }

        isSubmitting = true

        Task {
            defer { isSubmitting = false }

            if mode == .login {
                await authState.login(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password,
                    syncService: syncService,
                    repository: repository
                )
            } else {
                await authState.register(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password,
                    syncService: syncService,
                    repository: repository
                )
            }
        }
    }
}

struct RootTabView: View {
    @AppStorage("appearanceMode") private var appearanceMode: String = AppearanceMode.system.rawValue

    init() {
        // Keep the chrome (nav/tab bars) frosted; let content blur beneath on scroll.
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithDefaultBackground()
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }

    var body: some View {
        TabView {
            NavigationStack { CategoryListView() }
                .tabItem { Label("Группы", systemImage: "square.stack.3d.up") }

            NavigationStack { HistoryView() }
                .tabItem { Label("История", systemImage: "clock") }

            NavigationStack { SettingsView() }
                .tabItem { Label("Настройки", systemImage: "gearshape") }
        }
        .tint(AF.Color.accent)
        .preferredColorScheme(AppearanceMode(rawValue: appearanceMode)?.colorScheme)
    }
}

@main
struct FreezerApp: App {
    @StateObject private var syncService = SyncService.shared
    @StateObject private var repository = DataRepository(syncService: .shared)
    @StateObject private var authState = AuthState()
    @AppStorage("appLanguage") private var appLanguage: String = "ru"
    @Environment(\.scenePhase) private var scenePhase

    init() {
        AnalyticsService.shared.trackAppOpened()
        applyPreferredLanguage()

        let migrationKey = "v0.4_notifications_migration"
        if !UserDefaults.standard.bool(forKey: migrationKey) {
            let notificationsKey = "notificationsEnabled"
            if UserDefaults.standard.object(forKey: notificationsKey) != nil {
                UserDefaults.standard.set(false, forKey: notificationsKey)
            }
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
            Group {
                if authState.isChecking {
                    ZStack {
                        ArcticBackdrop()
                        ProgressView("Загрузка…")
                            .tint(AF.Color.accent)
                            .foregroundStyle(AF.Color.textSecondary)
                    }
                } else if authState.isAuthenticated {
                    RootTabView()
                } else {
                    AuthGateView()
                }
            }
            .environmentObject(repository)
            .environmentObject(syncService)
            .environmentObject(authState)
            .environment(\.locale, languageLocale)
            .id(appLanguage)
            .task {
                await authState.bootstrap(syncService: syncService)
            }
            .onReceive(NotificationCenter.default.publisher(for: .didAuthExpired)) { _ in
                Task {
                    await authState.logout(syncService: syncService, repository: repository)
                }
            }
            .onChange(of: scenePhase) { _, newPhase in
                switch newPhase {
                case .active:
                    syncService.handleAppDidBecomeActive()
                case .background:
                    // Guarantee a final flush of pending changes before suspension.
                    syncService.handleAppWillResignActive()
                default:
                    break
                }
            }
        }
    }
}
