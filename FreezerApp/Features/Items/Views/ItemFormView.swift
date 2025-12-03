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
        _expirationDate = State(initialValue: item?.expirationDate ?? Calendar.current.date(byAdding: .month, value: 1, to: Date()) ?? Date())
        _notes = State(initialValue: item?.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                Form {
                    // Name
                    Section("Название") {
                        TextField("Например: куриная грудка, клубника", text: $name)
                            .font(Theme.Typography.body)
                    }

                    // Quantity
                    Section("Количество") {
                        Stepper("Упаковок: \(packagesCount)", value: $packagesCount, in: 0...999)
                            .font(Theme.Typography.body)

                        Stepper("Штук: \(itemsCount)", value: $itemsCount, in: 0...999)
                            .font(Theme.Typography.body)
                    }

                    // Shelf
                    Section("Номер полки") {
                        Stepper("Полка \(shelfNumber)", value: $shelfNumber, in: 1...20)
                            .font(Theme.Typography.body)
                    }

                    // Dates
                    Section("Даты") {
                        DatePicker(
                            "Дата заморозки",
                            selection: $freezeDate,
                            displayedComponents: .date
                        )
                        .font(Theme.Typography.body)

                        DatePicker(
                            "Срок годности",
                            selection: $expirationDate,
                            displayedComponents: .date
                        )
                        .font(Theme.Typography.body)
                    }

                    // Notes
                    Section("Заметки (необязательно)") {
                        TextEditor(text: $notes)
                            .font(Theme.Typography.body)
                            .frame(minHeight: 100)
                    }

                    // Delete Button (only for editing)
                    if item != nil {
                        Section {
                            Button(role: .destructive) {
                                showDeleteConfirmation = true
                            } label: {
                                HStack {
                                    Spacer()
                                    Text("Удалить заготовку")
                                        .font(Theme.Typography.body)
                                    Spacer()
                                }
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle(item == nil ? "Новая заготовка" : "Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") {
                        saveItem()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .alert("Удалить заготовку?", isPresented: $showDeleteConfirmation) {
                Button("Отмена", role: .cancel) { }
                Button("Удалить", role: .destructive) {
                    deleteItem()
                }
            } message: {
                Text("Это действие нельзя отменить")
            }
        }
    }

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
