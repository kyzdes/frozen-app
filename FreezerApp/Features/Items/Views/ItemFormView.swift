import SwiftUI

struct ItemFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var repository: DataRepository

    let item: Item?
    let categoryId: String

    @State private var name: String
    @State private var packagesCount: Int
    @State private var itemsCount: Int
    @State private var shelfNumber: Int
    @State private var freezeDate: Date
    @State private var expirationDate: Date
    @State private var notes: String
    @State private var showDeleteConfirmation = false

    init(item: Item?, categoryId: String) {
        self.item = item
        self.categoryId = categoryId
        _name = State(initialValue: item?.name ?? "")
        _packagesCount = State(initialValue: item?.packagesCount ?? 1)
        _itemsCount = State(initialValue: item?.itemsCount ?? 1)
        _shelfNumber = State(initialValue: item?.shelfNumber ?? 1)
        _freezeDate = State(initialValue: item?.freezeDate ?? Date())
        _expirationDate = State(initialValue: item?.expirationDate ?? Calendar.current.date(byAdding: .month, value: 3, to: Date())!)
        _notes = State(initialValue: item?.notes ?? "")
    }

    private var category: Category? {
        repository.categories.first { $0.id == categoryId }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                ArcticBackdrop()

                ScrollView {
                    VStack(spacing: AF.Space.xl) {
                        // Name
                        group {
                            colField("Название") {
                                TextField("Например: Куриный бульон", text: $name)
                                    .font(AF.Typography.body)
                            }
                        }

                        // Quantity
                        section("Количество") {
                            group {
                                fieldRow("Упаковок") {
                                    AFStepper(value: packagesCount, min: 0) { packagesCount = $0 }
                                }
                                rowDivider
                                fieldRow("Штук") {
                                    AFStepper(value: itemsCount, min: 0) { itemsCount = $0 }
                                }
                                rowDivider
                                fieldRow("Полка") {
                                    AFStepper(value: shelfNumber, min: 1) { shelfNumber = $0 }
                                }
                            }
                        }

                        // Dates
                        section("Сроки") {
                            group {
                                fieldRow("Дата заморозки") {
                                    DatePicker("", selection: $freezeDate, displayedComponents: .date)
                                        .labelsHidden()
                                        .datePickerStyle(.compact)
                                        .tint(AF.Color.accent)
                                }
                                rowDivider
                                fieldRow("Срок годности") {
                                    DatePicker("", selection: $expirationDate, displayedComponents: .date)
                                        .labelsHidden()
                                        .datePickerStyle(.compact)
                                        .tint(AF.Color.accent)
                                }
                            }
                        }

                        // Category (read-only context)
                        section("Группа") {
                            group {
                                HStack(spacing: 10) {
                                    if let category {
                                        FrostCapsule(emoji: category.icon ?? "📦",
                                                     tint: category.color.map { Color(hex: $0) } ?? AF.Color.accent,
                                                     size: 38)
                                        Text(category.name)
                                            .font(AF.Typography.callout)
                                            .foregroundStyle(AF.Color.textPrimary)
                                    } else {
                                        Text("Группа").foregroundStyle(AF.Color.textTertiary)
                                    }
                                    Spacer()
                                }
                                .padding(.horizontal, AF.Space.l)
                                .padding(.vertical, AF.Space.m)
                            }
                        }

                        // Notes
                        section("Заметки") {
                            group {
                                ZStack(alignment: .topLeading) {
                                    if notes.isEmpty {
                                        Text("Добавьте заметку…")
                                            .font(AF.Typography.body)
                                            .foregroundStyle(AF.Color.textQuaternary)
                                            .padding(.horizontal, AF.Space.l + 1)
                                            .padding(.vertical, AF.Space.m + 1)
                                    }
                                    TextEditor(text: $notes)
                                        .font(AF.Typography.body)
                                        .foregroundStyle(AF.Color.textPrimary)
                                        .scrollContentBackground(.hidden)
                                        .frame(minHeight: 90)
                                        .padding(.horizontal, AF.Space.l - 4)
                                        .padding(.vertical, AF.Space.s)
                                }
                            }
                        }

                        if item != nil {
                            Button {
                                showDeleteConfirmation = true
                            } label: {
                                Label("Удалить заготовку", systemImage: "trash")
                            }
                            .buttonStyle(AFTintedButtonStyle(role: .danger))
                        }
                    }
                    .padding(.horizontal, AF.Space.l)
                    .padding(.vertical, AF.Space.l)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle(item == nil ? "Новая заготовка" : "Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { saveItem() }
                        .fontWeight(.semibold)
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .alert("Удалить заготовку?", isPresented: $showDeleteConfirmation) {
                Button("Отмена", role: .cancel) { }
                Button("Удалить", role: .destructive) { deleteItem() }
            } message: {
                Text("Это действие нельзя отменить")
            }
        }
    }

    // MARK: - Building blocks

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: AF.Space.s) {
            AFSectionTitle(text: title)
            content()
        }
    }

    @ViewBuilder
    private func group<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) { content() }
            .afGroup()
    }

    private func fieldRow<Trailing: View>(_ label: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack {
            Text(label)
                .font(AF.Typography.callout)
                .foregroundStyle(AF.Color.textSecondary)
            Spacer()
            trailing()
        }
        .frame(minHeight: 50)
        .padding(.horizontal, AF.Space.l)
        .padding(.vertical, AF.Space.s)
    }

    private func colField<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(AF.Typography.callout)
                .foregroundStyle(AF.Color.textSecondary)
            content()
                .foregroundStyle(AF.Color.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, AF.Space.l)
        .padding(.vertical, AF.Space.m)
    }

    private var rowDivider: some View {
        Divider().overlay(AF.Color.hairline).padding(.leading, AF.Space.l)
    }

    // MARK: - Persistence

    private func saveItem() {
        if let existing = item {
            var updated = existing
            updated.name = name
            updated.packagesCount = packagesCount
            updated.itemsCount = itemsCount
            updated.shelfNumber = shelfNumber
            updated.freezeDate = freezeDate
            updated.expirationDate = expirationDate
            updated.notes = notes.isEmpty ? nil : notes
            repository.updateItem(updated)
        } else {
            let newItem = Item(
                name: name,
                packagesCount: packagesCount,
                itemsCount: itemsCount,
                shelfNumber: shelfNumber,
                freezeDate: freezeDate,
                expirationDate: expirationDate,
                notes: notes.isEmpty ? nil : notes,
                categoryId: categoryId
            )
            repository.addItem(newItem)
        }
        dismiss()
    }

    private func deleteItem() {
        if let itemToDelete = item {
            repository.deleteItem(itemToDelete.id)
            dismiss()
        }
    }
}

#Preview {
    ItemFormView(item: nil, categoryId: "1")
        .environmentObject(DataRepository())
}
