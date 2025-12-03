import SwiftUI

struct ItemListView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var showingAddItem = false
    @State private var editingItem: Item?
    @State private var searchQuery = ""
    @State private var selectedShelf: Int?

    let category: Category

    private var items: [Item] {
        repository.getItems(for: category.id)
    }

    private var uniqueShelves: [Int] {
        Array(Set(items.map { $0.shelfNumber })).sorted()
    }

    private var filteredItems: [Item] {
        items.filter { item in
            let matchesSearch = searchQuery.isEmpty ||
                item.name.localizedCaseInsensitiveContains(searchQuery) ||
                (item.notes?.localizedCaseInsensitiveContains(searchQuery) ?? false)
            let matchesShelf = selectedShelf == nil || item.shelfNumber == selectedShelf
            return matchesSearch && matchesShelf
        }
    }

    var body: some View {
        ZStack {
            Theme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text(category.name)
                            .font(Theme.Typography.largeTitle)
                            .foregroundColor(Theme.Colors.textPrimary)

                        Text("\(items.count) \(itemsWord)")
                            .font(Theme.Typography.body)
                            .foregroundColor(Theme.Colors.textSecondary)
                    }
                    .padding(.horizontal, Theme.Spacing.lg)

                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Theme.Colors.textSecondary)

                        TextField("Поиск по названию или заметкам", text: $searchQuery)
                            .font(Theme.Typography.body)

                        if !searchQuery.isEmpty {
                            Button {
                                searchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(Theme.Colors.textSecondary)
                            }
                        }
                    }
                    .padding(Theme.Spacing.md)
                    .background(Theme.Colors.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                    .padding(.horizontal, Theme.Spacing.lg)

                    // Shelf Filter
                    if uniqueShelves.count > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: Theme.Spacing.sm) {
                                FilterChip(
                                    title: "Все полки",
                                    isSelected: selectedShelf == nil
                                ) {
                                    selectedShelf = nil
                                }

                                ForEach(uniqueShelves, id: \.self) { shelf in
                                    FilterChip(
                                        title: "Полка \(shelf)",
                                        isSelected: selectedShelf == shelf
                                    ) {
                                        selectedShelf = shelf
                                    }
                                }
                            }
                            .padding(.horizontal, Theme.Spacing.lg)
                        }
                    }

                    // Items List
                    if filteredItems.isEmpty {
                        emptyStateView
                    } else {
                        LazyVStack(spacing: Theme.Spacing.sm) {
                            ForEach(filteredItems) { item in
                                ItemRow(
                                    item: item,
                                    onEdit: { editingItem = item },
                                    onDelete: { repository.deleteItem(item.id) },
                                    onUpdatePackagesCount: { delta in
                                        repository.updateItemPackagesCount(item.id, delta: delta)
                                    },
                                    onUpdateItemsCount: { delta in
                                        repository.updateItemItemsCount(item.id, delta: delta)
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, Theme.Spacing.lg)
                    }
                }
                .padding(.bottom, 100)
            }

            // Add Button
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        showingAddItem = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 56, height: 56)
                            .background(Theme.Colors.primary)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                    }
                    .padding(.trailing, Theme.Spacing.lg)
                    .padding(.bottom, Theme.Spacing.xl)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingAddItem) {
            ItemFormView(item: nil, categoryId: category.id)
        }
        .sheet(item: $editingItem) { item in
            ItemFormView(item: item, categoryId: category.id)
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: items.isEmpty ? "plus.circle" : "magnifyingglass")
                .font(.system(size: 64))
                .foregroundColor(Theme.Colors.textTertiary)

            Text(items.isEmpty ? "Нет заготовок" : "Ничего не найдено")
                .font(Theme.Typography.body)
                .foregroundColor(Theme.Colors.textSecondary)

            Text(items.isEmpty ? "Нажмите +, чтобы добавить первую заготовку" : "Попробуйте изменить запрос")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.Colors.textTertiary)
        }
        .padding(.top, 64)
        .padding(.horizontal, Theme.Spacing.lg)
    }

    private var itemsWord: String {
        let count = items.count
        if count % 10 == 1 && count % 100 != 11 { return "заготовка" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "заготовки" }
        return "заготовок"
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.Typography.subheadline)
                .foregroundColor(isSelected ? .white : Theme.Colors.textSecondary)
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.vertical, Theme.Spacing.sm)
                .background(isSelected ? Theme.Colors.primary : Theme.Colors.cardBackground)
                .clipShape(Capsule())
        }
    }
}

#Preview {
    NavigationStack {
        ItemListView(category: Category.sampleCategories[0])
            .environmentObject(DataRepository())
    }
}
