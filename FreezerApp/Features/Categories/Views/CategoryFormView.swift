import SwiftUI

struct CategoryFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var repository: DataRepository

    let category: Category?

    @State private var name: String
    @State private var selectedIcon: String
    @State private var selectedColor: String
    @State private var customEmoji: String = ""
    @State private var customColor: Color = .clear
    @State private var showingDeleteConfirmation = false
    @State private var showValidation = false

    init(category: Category?) {
        self.category = category
        _name = State(initialValue: category?.name ?? "")
        _selectedIcon = State(initialValue: category?.icon ?? "🥬")
        _selectedColor = State(initialValue: category?.color ?? "#34C759")
        if let colorHex = category?.color {
            _customColor = State(initialValue: Color(hex: colorHex))
        } else {
            _customColor = State(initialValue: Color(hex: "#34C759"))
        }
        _customEmoji = State(initialValue: category?.icon ?? "")
    }

    private var nameError: String? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "Введите название" }
        if trimmed.count < 2 { return "Слишком короткое название" }
        return nil
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.xl) {
                        // Name Input
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("НАЗВАНИЕ")
                                .font(Theme.Typography.footnote)
                                .foregroundColor(Theme.Colors.textSecondary)

                            TextField("Название категории", text: $name)
                                .font(Theme.Typography.body)
                                .padding(Theme.Spacing.md)
                                .background(Theme.Colors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: Theme.CornerRadius.md)
                                        .stroke(nameError != nil && showValidation ? Theme.Colors.error : Color.clear, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))

                            if let nameError {
                                Text(nameError)
                                    .font(Theme.Typography.caption)
                                    .foregroundColor(Theme.Colors.error)
                            }
                        }

                        // Icon Selector
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("ИКОНКА")
                                .font(Theme.Typography.footnote)
                                .foregroundColor(Theme.Colors.textSecondary)

                            HStack(spacing: Theme.Spacing.sm) {
                                TextField("Ваш эмодзи", text: $customEmoji)
                                    .font(.system(size: 28))
                                    .multilineTextAlignment(.center)
                                    .frame(width: 70, height: 44)
                                    .background(Theme.Colors.cardBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                                    .onChange(of: customEmoji) { _, newValue in
                                        if let first = newValue.trimmingCharacters(in: .whitespacesAndNewlines).first {
                                            selectedIcon = String(first)
                                            customEmoji = String(first)
                                        } else {
                                            customEmoji = ""
                                        }
                                    }

                                Text("Или выберите из палитры ниже")
                                    .font(Theme.Typography.subheadline)
                                    .foregroundColor(Theme.Colors.textSecondary)
                            }

                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: Theme.Spacing.sm) {
                                ForEach(Theme.presetIcons, id: \.self) { icon in
                                    Button {
                                        selectedIcon = icon
                                        customEmoji = icon
                                    } label: {
                                        Text(icon)
                                            .font(.system(size: 32))
                                            .frame(maxWidth: .infinity)
                                            .aspectRatio(1, contentMode: .fill)
                                            .background(selectedIcon == icon ? Theme.Colors.primary : Theme.Colors.cardBackground)
                                            .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                                    }
                                }
                            }
                        }

                        // Color Selector
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("ЦВЕТ")
                                .font(Theme.Typography.footnote)
                                .foregroundColor(Theme.Colors.textSecondary)

                            HStack(spacing: Theme.Spacing.sm) {
                                ColorPicker("Свой цвет", selection: $customColor, supportsOpacity: false)
                                    .labelsHidden()
                                    .onChange(of: customColor) { _, newValue in
                                        selectedColor = newValue.toHexString() ?? selectedColor
                                    }

                                Text(selectedColor)
                                    .font(Theme.Typography.caption)
                                    .foregroundColor(Theme.Colors.textSecondary)
                            }

                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: Theme.Spacing.sm) {
                                ForEach(Theme.presetColors, id: \.self) { colorHex in
                                    Button {
                                        selectedColor = colorHex
                                        customColor = Color(hex: colorHex)
                                    } label: {
                                        Color(hex: colorHex)
                                            .frame(maxWidth: .infinity)
                                            .aspectRatio(1, contentMode: .fill)
                                            .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: Theme.CornerRadius.md)
                                                    .stroke(Theme.Colors.primary, lineWidth: selectedColor == colorHex ? 3 : 0)
                                            )
                                    }
                                }
                            }
                        }

                        // Preview
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("ПРЕДПРОСМОТР")
                                .font(Theme.Typography.footnote)
                                .foregroundColor(Theme.Colors.textSecondary)

                            HStack(spacing: Theme.Spacing.md) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: Theme.CornerRadius.md)
                                        .fill(Color(hex: selectedColor))
                                        .frame(width: 48, height: 48)

                                    Text(selectedIcon)
                                        .font(.system(size: 24))
                                }

                                Text(name.isEmpty ? "Название категории" : name)
                                    .font(Theme.Typography.body)
                                    .foregroundColor(Theme.Colors.textPrimary)

                                Spacer()
                            }
                            .padding(Theme.Spacing.lg)
                            .background(Color(hex: selectedColor).opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.lg))
                        }

                        // Delete Button (only for editing)
                        if category != nil {
                            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                                Button {
                                    showingDeleteConfirmation = true
                                } label: {
                                    HStack {
                                        Spacer()
                                        Text("Удалить категорию")
                                            .font(Theme.Typography.body)
                                            .foregroundColor(.white)
                                        Spacer()
                                    }
                                    .padding(Theme.Spacing.md)
                                    .background(Theme.Colors.error)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                                }
                            }
                            .padding(.top, Theme.Spacing.xl)
                        }
                    }
                    .padding(Theme.Spacing.lg)
                }
            }
            .navigationTitle(category == nil ? "Новая категория" : "Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(category == nil ? "Добавить" : "Сохранить") {
                        saveCategory()
                    }
                    .disabled(nameError != nil)
                }
            }
            .alert("Удалить категорию?", isPresented: $showingDeleteConfirmation) {
                Button("Отмена", role: .cancel) { }
                Button("Удалить", role: .destructive) {
                    deleteCategory()
                }
            } message: {
                Text("Все заготовки в этой категории также будут удалены. Это действие нельзя отменить.")
            }
        }
    }

    private func deleteCategory() {
        guard let category = category else { return }
        repository.deleteCategory(category.id)
        dismiss()
    }

    private func saveCategory() {
        showValidation = true
        guard nameError == nil else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return
        }

        // Тримминг выбранного эмодзи
        if let first = customEmoji.trimmingCharacters(in: .whitespacesAndNewlines).first {
            selectedIcon = String(first)
        }

        if let existing = category {
            var updated = existing
            updated.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.icon = selectedIcon
            updated.color = selectedColor
            repository.updateCategory(updated)
        } else {
            let newCategory = Category(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                icon: selectedIcon,
                color: selectedColor
            )
            repository.addCategory(newCategory)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        dismiss()
    }
}

#Preview {
    CategoryFormView(category: nil)
        .environmentObject(DataRepository())
}
