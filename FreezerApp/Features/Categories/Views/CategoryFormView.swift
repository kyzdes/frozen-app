import SwiftUI

struct CategoryFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var repository: DataRepository

    let category: Category?

    @State private var name: String
    @State private var selectedIcon: String
    @State private var selectedColor: String
    @State private var showingDeleteConfirmation = false

    init(category: Category?) {
        self.category = category
        _name = State(initialValue: category?.name ?? "")
        _selectedIcon = State(initialValue: category?.icon ?? "🥬")
        _selectedColor = State(initialValue: category?.color ?? Theme.presetColors[0])
    }

    private let iconColumns = Array(repeating: GridItem(.flexible(), spacing: AF.Space.s), count: 6)
    private let colorColumns = Array(repeating: GridItem(.flexible(), spacing: AF.Space.m), count: 8)

    var body: some View {
        NavigationStack {
            ZStack {
                ArcticBackdrop()

                ScrollView {
                    VStack(spacing: AF.Space.xl) {
                        previewCard

                        VStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Название группы")
                                    .font(AF.Typography.callout)
                                    .foregroundStyle(AF.Color.textSecondary)
                                TextField("Например: Овощи", text: $name)
                                    .font(AF.Typography.body)
                                    .foregroundStyle(AF.Color.textPrimary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, AF.Space.l)
                            .padding(.vertical, AF.Space.m)
                        }
                        .afGroup()

                        // Icon
                        VStack(alignment: .leading, spacing: AF.Space.s) {
                            AFSectionTitle(text: "Иконка")
                            LazyVGrid(columns: iconColumns, spacing: AF.Space.s) {
                                ForEach(Theme.presetIcons, id: \.self) { icon in
                                    Button { selectedIcon = icon } label: {
                                        Text(icon)
                                            .font(.system(size: 23))
                                            .frame(maxWidth: .infinity)
                                            .aspectRatio(1, contentMode: .fit)
                                            .background(
                                                RoundedRectangle(cornerRadius: 13, style: .continuous)
                                                    .fill(selectedIcon == icon ? AF.Color.accentSoft : AF.Color.fillTertiary)
                                            )
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 13, style: .continuous)
                                                    .strokeBorder(AF.Color.accent, lineWidth: selectedIcon == icon ? 1.5 : 0)
                                            )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(AF.Space.l)
                            .afGroup()
                        }

                        // Color
                        VStack(alignment: .leading, spacing: AF.Space.s) {
                            AFSectionTitle(text: "Цвет")
                            LazyVGrid(columns: colorColumns, spacing: AF.Space.m) {
                                ForEach(Theme.presetColors, id: \.self) { colorHex in
                                    Button { selectedColor = colorHex } label: {
                                        Circle()
                                            .fill(Color(hex: colorHex))
                                            .aspectRatio(1, contentMode: .fit)
                                            .overlay(
                                                Circle().strokeBorder(.white.opacity(0.5), lineWidth: 1).blendMode(.plusLighter)
                                            )
                                            .overlay {
                                                if selectedColor == colorHex {
                                                    Circle()
                                                        .strokeBorder(AF.Color.accent, lineWidth: 2)
                                                        .padding(-4)
                                                }
                                            }
                                            .shadow(color: Color(hex: colorHex).opacity(0.4), radius: 4, y: 2)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(AF.Space.l)
                            .afGroup()
                        }

                        if category != nil {
                            Button {
                                showingDeleteConfirmation = true
                            } label: {
                                Label("Удалить группу", systemImage: "trash")
                            }
                            .buttonStyle(AFTintedButtonStyle(role: .danger))
                        }
                    }
                    .padding(.horizontal, AF.Space.l)
                    .padding(.vertical, AF.Space.l)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle(category == nil ? "Новая группа" : "Редактировать группу")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { saveCategory() }
                        .fontWeight(.semibold)
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .alert("Удалить группу?", isPresented: $showingDeleteConfirmation) {
                Button("Отмена", role: .cancel) { }
                Button("Удалить", role: .destructive) { deleteCategory() }
            } message: {
                Text("Все заготовки в этой группе также будут удалены. Это действие нельзя отменить.")
            }
        }
    }

    private var previewCard: some View {
        HStack(spacing: AF.Space.m) {
            FrostCapsule(emoji: selectedIcon, tint: Color(hex: selectedColor), size: 64)
            VStack(alignment: .leading, spacing: 2) {
                Text(name.isEmpty ? "Название группы" : name)
                    .font(AF.Typography.headline)
                    .foregroundStyle(name.isEmpty ? AF.Color.textTertiary : AF.Color.textPrimary)
                Text("Предпросмотр")
                    .font(AF.Typography.footnote)
                    .foregroundStyle(AF.Color.textTertiary)
            }
            Spacer()
        }
        .padding(AF.Space.m)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AF.Radius.card, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: AF.Radius.card, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))
    }

    private func deleteCategory() {
        guard let category = category else { return }
        repository.deleteCategory(category.id)
        dismiss()
    }

    private func saveCategory() {
        if let existing = category {
            var updated = existing
            updated.name = name
            updated.icon = selectedIcon
            updated.color = selectedColor
            repository.updateCategory(updated)
        } else {
            let newCategory = Category(name: name, icon: selectedIcon, color: selectedColor)
            repository.addCategory(newCategory)
        }
        dismiss()
    }
}

#Preview {
    CategoryFormView(category: nil)
        .environmentObject(DataRepository())
}
