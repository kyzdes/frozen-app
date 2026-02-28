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
            Theme.Colors.background
                .ignoresSafeArea()

            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "snowflake")
                        .font(.system(size: 40, weight: .medium))
                        .foregroundColor(Theme.Colors.primary)

                    Text("FreezerApp")
                        .font(.largeTitle.weight(.bold))

                    Text(mode == .login ? "Войдите в аккаунт" : "Создайте аккаунт")
                        .foregroundColor(Theme.Colors.textSecondary)
                }

                HStack(spacing: 10) {
                    Button("Вход") {
                        mode = .login
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(mode == .login ? Theme.Colors.primary : Theme.Colors.cardBackground)

                    Button("Регистрация") {
                        mode = .register
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(mode == .register ? Theme.Colors.primary : Theme.Colors.cardBackground)
                }

                VStack(spacing: 12) {
                    if mode == .register {
                        TextField("Имя", text: $name)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .padding(12)
                            .background(Theme.Colors.cardBackground)
                            .cornerRadius(10)
                    }

                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(12)
                        .background(Theme.Colors.cardBackground)
                        .cornerRadius(10)

                    SecureField("Пароль (минимум 8 символов)", text: $password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(12)
                        .background(Theme.Colors.cardBackground)
                        .cornerRadius(10)
                }

                Button {
                    submit()
                } label: {
                    HStack {
                        if isSubmitting {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                        } else {
                            Text(mode == .login ? "Войти" : "Создать аккаунт")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.Colors.primary)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isSubmitting)

                if let errorMessage = authState.errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(24)
        }
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

@main
struct FreezerApp: App {
    @StateObject private var syncService = SyncService.shared
    @StateObject private var repository = DataRepository(syncService: .shared)
    @StateObject private var authState = AuthState()
    @AppStorage("appLanguage") private var appLanguage: String = "ru"

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
                    ProgressView("Загрузка…")
                } else if authState.isAuthenticated {
                    CategoryListView()
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
        }
    }
}
