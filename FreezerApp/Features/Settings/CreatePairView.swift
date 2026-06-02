import SwiftUI

struct CreatePairView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var syncService: SyncService

    @State private var pairName: String = "Наша морозилка"
    @State private var inviteCode: String?
    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var showCopiedAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                ArcticBackdrop()

                ScrollView {
                    VStack(spacing: AF.Space.xxl) {
                        if let code = inviteCode {
                            inviteCodeSection(code: code)
                        } else {
                            createPairSection
                        }
                    }
                    .padding(.horizontal, AF.Space.xxl)
                    .padding(.vertical, AF.Space.xxl)
                }
            }
            .navigationTitle("Общий холодильник")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
            }
            .alert("Ошибка", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                if let error = errorMessage { Text(error) }
            }
        }
    }

    // MARK: - Create

    private var createPairSection: some View {
        VStack(spacing: AF.Space.xxl) {
            VStack(spacing: AF.Space.l) {
                brandTile(system: "refrigerator.fill")
                VStack(spacing: 8) {
                    Text("Создать общий холодильник")
                        .font(AF.Typography.title3.weight(.bold))
                        .foregroundStyle(AF.Color.textPrimary)
                        .multilineTextAlignment(.center)
                    Text("Синхронизируйте данные с партнёром")
                        .font(AF.Typography.subheadline)
                        .foregroundStyle(AF.Color.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.top, AF.Space.s)

            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Название холодильника")
                        .font(AF.Typography.callout)
                        .foregroundStyle(AF.Color.textSecondary)
                    TextField("Например: Наша морозилка", text: $pairName)
                        .font(AF.Typography.body)
                        .foregroundStyle(AF.Color.textPrimary)
                        .disabled(isCreating)
                        .autocorrectionDisabled()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, AF.Space.l)
                .padding(.vertical, AF.Space.m)
            }
            .afGroup()

            Text("Это название увидит ваш партнёр при подключении")
                .font(AF.Typography.footnote)
                .foregroundStyle(AF.Color.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: createPair) {
                if isCreating {
                    ProgressView().tint(AF.Color.onAccent)
                } else {
                    Label("Создать холодильник", systemImage: "plus.circle.fill")
                }
            }
            .buttonStyle(AFPrimaryButtonStyle())
            .disabled(pairName.isEmpty || isCreating)
            .opacity(pairName.isEmpty ? 0.5 : 1)
        }
    }

    // MARK: - Invite code

    private func inviteCodeSection(code: String) -> some View {
        VStack(spacing: AF.Space.xxl) {
            VStack(spacing: AF.Space.l) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(AF.Color.fresh)
                    .scaleEffect(showCopiedAlert ? 1.1 : 1)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: showCopiedAlert)
                VStack(spacing: 8) {
                    Text("Холодильник создан!")
                        .font(AF.Typography.title3.weight(.bold))
                        .foregroundStyle(AF.Color.textPrimary)
                    Text("Поделитесь кодом с партнёром")
                        .font(AF.Typography.subheadline)
                        .foregroundStyle(AF.Color.textSecondary)
                }
            }
            .padding(.top, AF.Space.s)

            VStack(spacing: AF.Space.l) {
                Text("Код приглашения")
                    .font(AF.Typography.footnote.weight(.semibold))
                    .tracking(0.6)
                    .foregroundStyle(AF.Color.textTertiary)
                    .textCase(.uppercase)

                Text(code)
                    .font(.system(size: 30, weight: .bold, design: .monospaced))
                    .tracking(8)
                    .foregroundStyle(AF.Color.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AF.Space.l)
                    .background(AF.Color.accentSoft, in: RoundedRectangle(cornerRadius: AF.Radius.card, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: AF.Radius.card, style: .continuous)
                            .strokeBorder(AF.Color.accent, style: StrokeStyle(lineWidth: 1, dash: [5]))
                    )

                Button(action: copyCode) {
                    Label(showCopiedAlert ? "Скопировано!" : "Скопировать код",
                          systemImage: showCopiedAlert ? "checkmark.circle.fill" : "doc.on.doc.fill")
                }
                .buttonStyle(AFPrimaryButtonStyle())

                Text("Код действителен 24 часа. Отправьте его партнёру любым удобным способом")
                    .font(AF.Typography.footnote)
                    .foregroundStyle(AF.Color.textTertiary)
                    .multilineTextAlignment(.center)
            }
            .padding(AF.Space.l)
            .afGroup()

            Button("Готово") { dismiss() }
                .buttonStyle(AFTintedButtonStyle())
        }
    }

    private func brandTile(system: String) -> some View {
        Image(systemName: system)
            .font(.system(size: 38))
            .foregroundStyle(AF.Color.accent)
            .frame(width: 84, height: 84)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .background(AF.Color.accent.opacity(0.16), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(AF.Color.frostEdge, lineWidth: 0.5))
            .shadow(color: AF.Color.accent.opacity(0.35), radius: 14, y: 8)
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
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            }
        }
    }

    private func copyCode() {
        guard let code = inviteCode else { return }
        UIPasteboard.general.string = code
        withAnimation { showCopiedAlert = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation { showCopiedAlert = false }
        }
    }
}

#Preview {
    CreatePairView()
        .environmentObject(SyncService.shared)
}
