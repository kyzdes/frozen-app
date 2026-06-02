import SwiftUI

struct JoinPairView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var syncService: SyncService

    @State private var inviteCode: String = ""
    @State private var isJoining = false
    @State private var errorMessage: String?
    @State private var showWarning = false
    @State private var successMessage: String?
    @State private var importMode: String = "replace"

    var body: some View {
        NavigationStack {
            ZStack {
                ArcticBackdrop()

                ScrollView {
                    VStack(spacing: AF.Space.xxl) {
                        if let success = successMessage {
                            successSection(message: success)
                        } else {
                            joinPairSection
                        }
                    }
                    .padding(.horizontal, AF.Space.xxl)
                    .padding(.vertical, AF.Space.xxl)
                }
            }
            .navigationTitle("Подключиться по коду")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
            }
            .alert("Внимание", isPresented: $showWarning) {
                Button("Отмена", role: .cancel) { showWarning = false }
                Button("Продолжить", role: .destructive) {
                    showWarning = false
                    performJoin()
                }
            } message: {
                Text(importMode == "replace"
                     ? "Ваши личные данные будут заменены на данные общего холодильника."
                     : "Ваши личные данные будут перенесены в общий холодильник без дедупликации.")
            }
            .alert("Ошибка", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                if let error = errorMessage { Text(error) }
            }
        }
    }

    // MARK: - Join

    private var joinPairSection: some View {
        VStack(spacing: AF.Space.xxl) {
            VStack(spacing: AF.Space.l) {
                Image(systemName: "link.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(AF.Color.accent)
                    .frame(width: 84, height: 84)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(AF.Color.frostEdge, lineWidth: 0.5))
                    .shadow(color: AF.Color.accent.opacity(0.35), radius: 14, y: 8)
                VStack(spacing: 8) {
                    Text("Подключиться")
                        .font(AF.Typography.title3.weight(.bold))
                        .foregroundStyle(AF.Color.textPrimary)
                    Text("Введите код от партнёра")
                        .font(AF.Typography.subheadline)
                        .foregroundStyle(AF.Color.textSecondary)
                }
            }
            .padding(.top, AF.Space.s)

            VStack(spacing: AF.Space.l) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Код приглашения")
                        .font(AF.Typography.callout)
                        .foregroundStyle(AF.Color.textSecondary)
                    TextField("", text: $inviteCode, prompt: Text("A3X7K9").foregroundColor(AF.Color.textQuaternary))
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.system(size: 30, weight: .bold, design: .monospaced))
                        .tracking(6)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(AF.Color.accent)
                        .disabled(isJoining)
                        .onChange(of: inviteCode) { _, newValue in
                            inviteCode = String(newValue.uppercased().prefix(6))
                        }
                        .padding(.vertical, AF.Space.m)
                        .frame(maxWidth: .infinity)
                        .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: AF.Radius.field, style: .continuous))
                }

                VStack(alignment: .leading, spacing: AF.Space.s) {
                    AFSectionTitle(text: "При подключении").padding(.leading, 0)
                    Picker("", selection: $importMode) {
                        Text("Заменить мои данные").tag("replace")
                        Text("Объединить").tag("merge")
                    }
                    .pickerStyle(.segmented)
                }
            }
            .padding(AF.Space.l)
            .afGroup()

            // Info card
            VStack(alignment: .leading, spacing: AF.Space.m) {
                HStack(spacing: AF.Space.m) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundStyle(AF.Color.soon)
                        .font(.title3)
                    Text("Что произойдёт?")
                        .font(AF.Typography.headline)
                        .foregroundStyle(AF.Color.textPrimary)
                }
                VStack(alignment: .leading, spacing: AF.Space.m) {
                    InfoRow(icon: "arrow.triangle.2.circlepath", text: importMode == "replace"
                            ? "Личные данные будут заменены"
                            : "Личные данные добавятся в общий холодильник")
                    InfoRow(icon: "person.2.fill", text: "Изменения синхронизируются между устройствами")
                    InfoRow(icon: "clock.fill", text: "Автоматическая синхронизация каждые 5 секунд")
                }
                .font(AF.Typography.callout)
                .foregroundStyle(AF.Color.textSecondary)
            }
            .padding(AF.Space.l)
            .afGroup()

            Button(action: { showWarning = true }) {
                if isJoining {
                    ProgressView().tint(AF.Color.onAccent)
                } else {
                    Label("Подключиться", systemImage: "link.circle.fill")
                }
            }
            .buttonStyle(AFPrimaryButtonStyle())
            .disabled(inviteCode.count != 6 || isJoining)
            .opacity(inviteCode.count != 6 ? 0.5 : 1)
        }
    }

    // MARK: - Success

    private func successSection(message: String) -> some View {
        VStack(spacing: AF.Space.xxl) {
            Spacer(minLength: 40)
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 70))
                .foregroundStyle(AF.Color.fresh)
            VStack(spacing: AF.Space.m) {
                Text("Успешно подключено!")
                    .font(AF.Typography.title2)
                    .foregroundStyle(AF.Color.textPrimary)
                Text(message)
                    .font(AF.Typography.body)
                    .foregroundStyle(AF.Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            HStack(spacing: 8) {
                Image(systemName: "arrow.triangle.2.circlepath")
                Text("Синхронизация активна").fontWeight(.medium)
            }
            .font(AF.Typography.subheadline)
            .foregroundStyle(AF.Color.fresh)
            .padding(.horizontal, AF.Space.l)
            .padding(.vertical, AF.Space.m)
            .background(AF.Color.freshBg, in: Capsule())

            Spacer(minLength: 40)

            Button("Готово") { dismiss() }
                .buttonStyle(AFPrimaryButtonStyle())
        }
    }

    // MARK: - Actions

    private func performJoin() {
        guard inviteCode.count == 6 else { return }
        isJoining = true
        errorMessage = nil
        Task {
            do {
                try await syncService.joinPair(inviteCode: inviteCode, importMode: importMode)
                await MainActor.run {
                    successMessage = "Вы подключились к общему холодильнику"
                    isJoining = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { dismiss() }
                }
            } catch {
                await MainActor.run {
                    let message: String
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .serverError(let msg): message = msg
                        case .unauthorized: message = "Неверный код приглашения"
                        case .networkError: message = "Ошибка сети. Проверьте подключение к интернету"
                        default: message = "Не удалось подключиться"
                        }
                    } else {
                        message = error.localizedDescription
                    }
                    errorMessage = message
                    isJoining = false
                }
            }
        }
    }
}

// MARK: - Helper Views

struct InfoRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(AF.Color.accent)
                .frame(width: 18)
            Text(text)
            Spacer(minLength: 0)
        }
    }
}

#Preview {
    JoinPairView()
        .environmentObject(SyncService.shared)
}
