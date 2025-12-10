import SwiftUI

struct JoinPairView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var syncService: SyncService

    @State private var inviteCode: String = ""
    @State private var isJoining = false
    @State private var errorMessage: String?
    @State private var showWarning = false
    @State private var successMessage: String?

    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(.systemBackground),
                        Color(.systemGray6).opacity(0.3)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 32) {
                        if let success = successMessage {
                            // Success state
                            successSection(message: success)
                        } else {
                            // Input state
                            joinPairSection
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 32)
                }
            }
            .navigationTitle("Подключиться")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }
            }
            .alert("Внимание", isPresented: $showWarning) {
                Button("Отмена", role: .cancel) {
                    showWarning = false
                }
                Button("Продолжить", role: .destructive) {
                    showWarning = false
                    performJoin()
                }
            } message: {
                Text("Ваши локальные данные будут заменены на данные общего холодильника. Это действие нельзя отменить.")
            }
            .alert("Ошибка", isPresented: .constant(errorMessage != nil)) {
                Button("OK") {
                    errorMessage = nil
                }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }

    // MARK: - Join Section
    private var joinPairSection: some View {
        VStack(spacing: 28) {
            // Header icon
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)

                    Image(systemName: "link.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.blue, Color.blue.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }

                VStack(spacing: 8) {
                    Text("Присоединиться")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Введите код от партнера")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.top, 20)

            // Code input card
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Код приглашения")
                        .font(.headline)
                        .foregroundColor(.primary)

                    TextField("", text: $inviteCode, prompt: Text("A3X7K9").foregroundColor(.secondary))
                        .textFieldStyle(.plain)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .tracking(6)
                        .multilineTextAlignment(.center)
                        .padding(20)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .disabled(isJoining)
                        .onChange(of: inviteCode) { _, newValue in
                            inviteCode = String(newValue.uppercased().prefix(6))
                        }

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Введите 6-значный код, полученный от партнера")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(20)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
            }

            // Info card
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.orange, Color.orange.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .font(.title3)

                    Text("Что произойдет?")
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 12) {
                    InfoRow(icon: "arrow.triangle.2.circlepath", text: "Ваши данные заменятся на данные общего холодильника")
                    InfoRow(icon: "person.2.fill", text: "Изменения синхронизируются между устройствами")
                    InfoRow(icon: "clock.fill", text: "Автоматическая синхронизация каждые 5 секунд")
                }
                .font(.callout)
                .foregroundColor(.secondary)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Color(.systemGray4), lineWidth: 1)
            )

            Spacer()

            // Action button
            Button(action: { showWarning = true }) {
                HStack(spacing: 12) {
                    if isJoining {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: "link.circle.fill")
                            .font(.title3)
                        Text("Подключиться")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
            }
            .background(
                LinearGradient(
                    colors: inviteCode.count != 6 || isJoining ?
                        [Color.gray, Color.gray] :
                        [Color.blue, Color.blue.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(16)
            .shadow(color: (inviteCode.count != 6 || isJoining ? Color.clear : Color.blue.opacity(0.3)), radius: 8, y: 4)
            .disabled(inviteCode.count != 6 || isJoining)
            .animation(.easeInOut(duration: 0.2), value: inviteCode.count)
        }
    }

    // MARK: - Success Section
    private func successSection(message: String) -> some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.green.opacity(0.2), Color.green.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 70))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.green, Color.green.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                .scaleEffect(1.0)
                .animation(.spring(response: 0.5, dampingFraction: 0.6), value: successMessage)

                VStack(spacing: 12) {
                    Text("Успешно подключено!")
                        .font(.title)
                        .fontWeight(.bold)

                    Text(message)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(.green)
                        Text("Синхронизация активна")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(
                        Capsule()
                            .fill(Color.green.opacity(0.1))
                    )
                }
            }

            Spacer()

            Button(action: { dismiss() }) {
                Text("Готово")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
            }
            .background(
                LinearGradient(
                    colors: [Color.green, Color.green.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(16)
            .shadow(color: Color.green.opacity(0.3), radius: 8, y: 4)
        }
    }

    // MARK: - Actions
    private func performJoin() {
        guard inviteCode.count == 6 else { return }

        isJoining = true
        errorMessage = nil

        Task {
            do {
                try await syncService.joinPair(inviteCode: inviteCode)
                await MainActor.run {
                    successMessage = "Вы подключились к общему холодильнику"
                    isJoining = false

                    // Auto-dismiss after 2 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    let message: String
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .serverError(let msg):
                            message = msg
                        case .unauthorized:
                            message = "Неверный код приглашения"
                        case .networkError:
                            message = "Ошибка сети. Проверьте подключение к интернету"
                        default:
                            message = "Не удалось подключиться"
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
                .frame(width: 16)
            Text(text)
        }
    }
}

#Preview {
    JoinPairView()
        .environmentObject(SyncService.shared)
}
