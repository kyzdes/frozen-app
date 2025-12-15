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

                    // Shelf Filter
                    if uniqueShelves.count > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: Theme.Spacing.sm) {
                                FilterChip(
                                    title: LK("Все полки"),
                                    isSelected: selectedShelf == nil
                                ) {
                                    selectedShelf = nil
                                }

                                ForEach(uniqueShelves, id: \.self) { shelf in
                                    FilterChip(
                                        title: LK(String(format: LKS("Полка %d"), shelf)),
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
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        repository.deleteItem(item.id)
                                    } label: {
                                        Label(LK("Удалить"), systemImage: "trash")
                                    }

                                    Button {
                                        editingItem = item
                                    } label: {
                                        Label(LK("Редактировать"), systemImage: "pencil")
                                    }
                                    .tint(Theme.Colors.primary)
                                }
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
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
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
        .searchable(text: $searchQuery, placement: .navigationBarDrawer(displayMode: .automatic), prompt: LK("Поиск по названию или заметкам"))
    }

    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: items.isEmpty ? "plus.circle" : "magnifyingglass")
                .font(.system(size: 64))
                .foregroundColor(Theme.Colors.textTertiary)

            Text(items.isEmpty ? LK("Нет заготовок") : LK("Ничего не найдено"))
                .font(Theme.Typography.body)
                .foregroundColor(Theme.Colors.textSecondary)

            Text(items.isEmpty ? LK("Нажмите +, чтобы добавить первую заготовку") : LK("Попробуйте изменить запрос"))
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.Colors.textTertiary)

            Button {
                showingAddItem = true
            } label: {
                Label(LK("Добавить заготовку"), systemImage: "plus.circle.fill")
                    .font(Theme.Typography.callout)
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(Theme.Colors.primary.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .padding(.top, 64)
        .padding(.horizontal, Theme.Spacing.lg)
    }

    private var itemsWord: String {
        let count = items.count
        if count % 10 == 1 && count % 100 != 11 { return NSLocalizedString("заготовка", comment: "item singular") }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return NSLocalizedString("заготовки", comment: "items few") }
        return NSLocalizedString("заготовок", comment: "items many")
    }
}

struct FilterChip: View {
    let title: LocalizedStringKey
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
