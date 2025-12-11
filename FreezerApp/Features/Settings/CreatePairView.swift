import SwiftUI

struct CreatePairView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var syncService: SyncService

    @State private var pairName: String = ""
    @State private var inviteCode: String?
    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var showCopiedAlert = false

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
                        if let code = inviteCode {
                            // Success state - show invite code
                            inviteCodeSection(code: code)
                        } else {
                            // Input state - enter pair name
                            createPairSection
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 32)
                }
            }
            .navigationTitle("Создать холодильник")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }
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

    // MARK: - Create Section
    private var createPairSection: some View {
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

                    Image(systemName: "refrigerator.fill")
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
                    Text("Создать общий холодильник")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Синхронизируйте данные с партнером")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.top, 20)

            // Input card
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Название холодильника")
                        .font(.headline)
                        .foregroundColor(.primary)

                    TextField("Например: Наш холодильник", text: $pairName)
                        .textFieldStyle(.plain)
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .disabled(isCreating)
                        .autocorrectionDisabled()

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Это название увидит ваш партнер при подключении")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(20)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
            }

            Spacer()

            // Action button
            Button(action: createPair) {
                HStack(spacing: 12) {
                    if isCreating {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                        Text("Создать холодильник")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
            }
            .background(
                LinearGradient(
                    colors: pairName.isEmpty || isCreating ?
                        [Color.gray, Color.gray] :
                        [Color.blue, Color.blue.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(16)
            .shadow(color: (pairName.isEmpty || isCreating ? Color.clear : Color.blue.opacity(0.3)), radius: 8, y: 4)
            .disabled(pairName.isEmpty || isCreating)
            .animation(.easeInOut(duration: 0.2), value: pairName.isEmpty)
        }
    }

    // MARK: - Invite Code Section
    private func inviteCodeSection(code: String) -> some View {
        VStack(spacing: 32) {
            // Success icon
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.green.opacity(0.2), Color.green.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 100, height: 100)

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.green, Color.green.opacity(0.7)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                .scaleEffect(showCopiedAlert ? 1.1 : 1.0)
                .animation(.spring(response: 0.3, dampingFraction: 0.6), value: showCopiedAlert)

                VStack(spacing: 8) {
                    Text("Холодильник создан!")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Поделитесь кодом с партнером")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 20)

            // Invite code card
            VStack(spacing: 20) {
                VStack(spacing: 12) {
                    Text("Код приглашения")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .tracking(1)

                    Text(code)
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .tracking(8)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.blue, Color.blue.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .padding(.vertical, 24)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(.systemGray6))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(
                                    LinearGradient(
                                        colors: [Color.blue.opacity(0.3), Color.blue.opacity(0.1)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 2
                                )
                        )
                }

                Button(action: copyCode) {
                    HStack(spacing: 10) {
                        Image(systemName: showCopiedAlert ? "checkmark.circle.fill" : "doc.on.doc.fill")
                            .font(.title3)
                        Text(showCopiedAlert ? "Скопировано!" : "Скопировать код")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                }
                .background(
                    LinearGradient(
                        colors: showCopiedAlert ?
                            [Color.green, Color.green.opacity(0.8)] :
                            [Color.blue, Color.blue.opacity(0.8)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(16)
                .shadow(color: (showCopiedAlert ? Color.green : Color.blue).opacity(0.3), radius: 8, y: 4)
                .animation(.easeInOut(duration: 0.2), value: showCopiedAlert)

                HStack(spacing: 8) {
                    Image(systemName: "info.circle.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Код действителен 24 часа. Отправьте его партнеру любым удобным способом")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 4)
            }
            .padding(24)
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.08), radius: 12, y: 4)

            Spacer()

            Button(action: { dismiss() }) {
                Text("Готово")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
            }
            .background(Color(.systemGray5))
            .foregroundColor(.primary)
            .cornerRadius(16)
        }
    }

    // MARK: - Actions
    private func createPair() {
        guard !pairName.isEmpty else { return }

        isCreating = true
        errorMessage = nil

        Task {
            do {
                let code = try await syncService.createPair(name: pairName)
                await MainActor.run {
                    inviteCode = code
                    isCreating = false
                }
            } catch let error as APIError {
                await MainActor.run {
                    print("❌ CreatePairView: APIError caught - \(error)")
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            } catch {
                await MainActor.run {
                    print("❌ CreatePairView: Unknown error - \(error)")
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            }
        }
    }

    private func copyCode() {
        guard let code = inviteCode else { return }
        UIPasteboard.general.string = code

        withAnimation {
            showCopiedAlert = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showCopiedAlert = false
            }
        }
    }
}

#Preview {
    CreatePairView()
        .environmentObject(SyncService.shared)
}
