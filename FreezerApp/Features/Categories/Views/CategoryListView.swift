import SwiftUI
import UIKit

struct CategoryListView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var showingAddCategory = false
    @State private var editingCategory: Category?
    @State private var editingItem: Item?
    @State private var editMode: EditMode = .inactive
    @State private var expandedCategories: Set<String> = []
    @State private var showingSettings = false
    @State private var searchQuery = ""
    @State private var selectedShelf: Int?
    @AppStorage("appearanceMode") private var appearanceMode: String = "Системная"

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                if repository.categories.isEmpty {
                    VStack {
                        // Header for empty state
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                Image(systemName: "snowflake")
                                    .font(.largeTitle)
                                    .foregroundColor(Theme.Colors.primary)

                                Text("Морозилка")
                                    .font(Theme.Typography.largeTitle)
                                    .foregroundColor(Theme.Colors.textPrimary)
                            }

                            Text("\(totalItems) \(itemsWord) в \(repository.categories.count) \(categoriesWord)")
                                .font(Theme.Typography.body)
                                .foregroundColor(Theme.Colors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, Theme.Spacing.lg)
                        .padding(.top, Theme.Spacing.sm)

                        emptyStateView
                        Spacer()
                    }
                } else {
                    List {
                        // Header Section
                        Section {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    HStack(spacing: 8) {
                                        Image(systemName: "snowflake")
                                            .font(.largeTitle)
                                            .foregroundColor(Theme.Colors.primary)

                                        Text("Морозилка")
                                            .font(Theme.Typography.largeTitle)
                                            .foregroundColor(Theme.Colors.textPrimary)
                                    }

                                    Spacer()

                                    // Expand/Collapse All Button
                                    Button {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                            if expandedCategories.count == repository.categories.count {
                                                expandedCategories.removeAll()
                                            } else {
                                                expandedCategories = Set(repository.categories.map { $0.id })
                                            }
                                        }
                                    } label: {
                                        Text(expandedCategories.count == repository.categories.count ? "Свернуть все" : "Развернуть все")
                                            .font(Theme.Typography.caption)
                                            .foregroundColor(Theme.Colors.primary)
                                    }
                                }

                                Text("\(totalItems) \(itemsWord) в \(repository.categories.count) \(categoriesWord)")
                                    .font(Theme.Typography.body)
                                    .foregroundColor(Theme.Colors.textSecondary)
                            }
                            .listRowInsets(EdgeInsets(top: Theme.Spacing.sm, leading: Theme.Spacing.lg, bottom: Theme.Spacing.md, trailing: Theme.Spacing.lg))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        }

                        // Search & Filter Section
                        Section {
                            VStack(spacing: Theme.Spacing.md) {
                                // Search Bar
                                HStack {
                                    Image(systemName: "magnifyingglass")
                                        .foregroundColor(Theme.Colors.textSecondary)
                                    TextField("Поиск по заготовкам", text: $searchQuery)
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
                                .cornerRadius(Theme.CornerRadius.md)

                                // Shelf Filter
                                if !uniqueShelves.isEmpty {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: Theme.Spacing.sm) {
                                            ForEach(uniqueShelves, id: \.self) { shelf in
                                                Button {
                                                    if selectedShelf == shelf {
                                                        selectedShelf = nil
                                                    } else {
                                                        selectedShelf = shelf
                                                    }
                                                } label: {
                                                    Text("Полка \(shelf)")
                                                        .font(Theme.Typography.callout)
                                                        .padding(.horizontal, Theme.Spacing.md)
                                                        .padding(.vertical, Theme.Spacing.sm)
                                                        .background(selectedShelf == shelf ? Theme.Colors.primary : Theme.Colors.cardBackground)
                                                        .foregroundColor(selectedShelf == shelf ? .white : Theme.Colors.textPrimary)
                                                        .cornerRadius(Theme.CornerRadius.md)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .listRowInsets(EdgeInsets(top: Theme.Spacing.sm, leading: Theme.Spacing.lg, bottom: Theme.Spacing.md, trailing: Theme.Spacing.lg))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        }

                        // Categories Section
                        Section {
                            ForEach(filteredCategories) { category in
                                VStack(spacing: 0) {
                                    // Category Card
                                    CategoryCard(
                                        category: category,
                                        isExpanded: expandedCategories.contains(category.id),
                                        onEdit: { editingCategory = category },
                                        onLongPress: {
                                            let impact = UIImpactFeedbackGenerator(style: .medium)
                                            impact.impactOccurred()
                                            withAnimation {
                                                editMode = .active
                                            }
                                        }
                                    )
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                            if expandedCategories.contains(category.id) {
                                                expandedCategories.remove(category.id)
                                            } else {
                                                expandedCategories.insert(category.id)
                                            }
                                        }
                                    }

                                    // Expanded Items
                                    if expandedCategories.contains(category.id) {
                                        let items = repository.getItems(for: category.id)

                                        VStack(spacing: Theme.Spacing.sm) {
                                            if !items.isEmpty {
                                                ForEach(items) { item in
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

                                            // View All / Add Button
                                            NavigationLink(value: category) {
                                                HStack {
                                                    Spacer()
                                                    Text(items.isEmpty ? "Добавить +" : "Открыть полный список")
                                                        .font(Theme.Typography.body)
                                                        .foregroundColor(Theme.Colors.primary)
                                                    if !items.isEmpty {
                                                        Image(systemName: "arrow.right")
                                                            .font(.system(size: 12, weight: .semibold))
                                                            .foregroundColor(Theme.Colors.primary)
                                                    }
                                                    Spacer()
                                                }
                                                .padding(.vertical, Theme.Spacing.md)
                                            }
                                        }
                                        .padding(.top, Theme.Spacing.md)
                                    }
                                }
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(
                                    top: Theme.Spacing.sm / 2,
                                    leading: Theme.Spacing.lg,
                                    bottom: Theme.Spacing.sm / 2,
                                    trailing: Theme.Spacing.lg
                                ))
                            }
                            .onMove { fromOffsets, toOffset in
                                var reordered = repository.categories
                                reordered.move(fromOffsets: fromOffsets, toOffset: toOffset)
                                repository.reorderCategories(reordered)
                            }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .environment(\.editMode, $editMode)
                    .overlay(alignment: .top) {
                        if editMode == .active {
                            HStack {
                                Text("Перетащите категории для изменения порядка")
                                    .font(Theme.Typography.footnote)
                                    .foregroundColor(.white)
                                Spacer()
                                Button("Готово") {
                                    withAnimation {
                                        editMode = .inactive
                                    }
                                }
                                .font(Theme.Typography.footnote)
                                .foregroundColor(.white)
                            }
                            .padding(Theme.Spacing.md)
                            .background(Theme.Colors.primary)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.md))
                            .padding(Theme.Spacing.lg)
                            .padding(.top, Theme.Spacing.sm)
                        }
                    }
                }
            }
            .navigationDestination(for: Category.self) { category in
                ItemListView(category: category)
            }
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Button {
                        showingSettings = true
                    } label: {
                        Label("Настройки", systemImage: "gear")
                    }

                    Spacer()

                    Button {
                        showingAddCategory = true
                    } label: {
                        Label("Добавить", systemImage: "plus")
                    }
                    .tint(Theme.Colors.primary)
                }
            }
            .sheet(isPresented: $showingAddCategory) {
                CategoryFormView(category: nil)
            }
            .sheet(item: $editingCategory) { category in
                CategoryFormView(category: category)
            }
            .sheet(item: $editingItem) { item in
                ItemFormView(item: item, categoryId: item.categoryId)
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
                    .environmentObject(repository)
            }
            .preferredColorScheme(selectedColorScheme)
        }
    }

    private var selectedColorScheme: ColorScheme? {
        switch appearanceMode {
        case "Светлая": return .light
        case "Темная": return .dark
        default: return nil // System
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: "snowflake")
                .font(.system(size: 64))
                .foregroundColor(Theme.Colors.textTertiary)

            Text("Нет категорий")
                .font(Theme.Typography.body)
                .foregroundColor(Theme.Colors.textSecondary)

            Text("Нажмите +, чтобы создать первую категорию")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.Colors.textTertiary)
        }
        .padding(.top, 64)
    }

    private var totalItems: Int {
        repository.categories.reduce(0) { $0 + $1.itemCount }
    }

    private var itemsWord: String {
        let count = totalItems
        if count % 10 == 1 && count % 100 != 11 { return "заготовка" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "заготовки" }
        return "заготовок"
    }

    private var categoriesWord: String {
        let count = repository.categories.count
        if count % 10 == 1 && count % 100 != 11 { return "категории" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "категориях" }
        return "категориях"
    }

    // MARK: - Search & Filter

    private var allItems: [Item] {
        repository.items
    }

    private var uniqueShelves: [Int] {
        Array(Set(allItems.map { $0.shelfNumber })).sorted()
    }

    private var filteredItems: [Item] {
        allItems.filter { item in
            let matchesSearch = searchQuery.isEmpty ||
                item.name.localizedCaseInsensitiveContains(searchQuery) ||
                (item.notes?.localizedCaseInsensitiveContains(searchQuery) ?? false)
            let matchesShelf = selectedShelf == nil || item.shelfNumber == selectedShelf
            return matchesSearch && matchesShelf
        }
    }

    private var filteredCategories: [Category] {
        if searchQuery.isEmpty && selectedShelf == nil {
            return repository.categories
        }

        let categoryIds = Set(filteredItems.map { $0.categoryId })
        return repository.categories.filter { category in
            categoryIds.contains(category.id) ||
            category.name.localizedCaseInsensitiveContains(searchQuery)
        }
    }
}

#Preview {
    CategoryListView()
        .environmentObject(DataRepository())
}
