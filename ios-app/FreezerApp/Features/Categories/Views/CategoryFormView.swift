import SwiftUI

struct CategoryFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var repository: DataRepository

    let category: Category?

    @State private var name: String
    @State private var selectedIcon: String
    @State private var selectedColor: String

    init(category: Category?) {
        self.category = category
        _name = State(initialValue: category?.name ?? "")
        _selectedIcon = State(initialValue: category?.icon ?? "🥬")
        _selectedColor = State(initialValue: category?.color ?? "#34C759")
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
                                .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                        }

                        // Icon Selector
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Text("ИКОНКА")
                                .font(Theme.Typography.footnote)
                                .foregroundColor(Theme.Colors.textSecondary)

                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: Theme.Spacing.sm) {
                                ForEach(Theme.presetIcons, id: \.self) { icon in
                                    Button {
                                        selectedIcon = icon
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

                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: Theme.Spacing.sm) {
                                ForEach(Theme.presetColors, id: \.self) { colorHex in
                                    Button {
                                        selectedColor = colorHex
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
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private func saveCategory() {
        if let existing = category {
            var updated = existing
            updated.name = name
            updated.icon = selectedIcon
            updated.color = selectedColor
            repository.updateCategory(updated)
        } else {
            let newCategory = Category(
                name: name,
                icon: selectedIcon,
                color: selectedColor
            )
            repository.addCategory(newCategory)
        }
        dismiss()
    }
}

#Preview {
    CategoryFormView(category: nil)
        .environmentObject(DataRepository())
}
