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
    @State private var showingHistory = false
    @State private var searchQuery = ""
    @State private var selectedShelf: Int?
    @AppStorage("appearanceMode") private var appearanceMode: String = "Системная"
    private let expansionAnimation = Animation.spring(response: 0.32, dampingFraction: 0.85, blendDuration: 0.12)

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Theme.Spacing.md) {
                        header

                        if repository.categories.isEmpty {
                            emptyStateView
                                .frame(maxWidth: .infinity)
                                .padding(.horizontal, Theme.Spacing.lg)
                        } else {
                            ForEach(filteredCategories) { category in
                                categoryBlock(for: category)
                                    .padding(.horizontal, Theme.Spacing.lg)
                            }
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
                        showingHistory = true
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.title2)
                            .imageScale(.large)
                    }

                    Spacer(minLength: Theme.Spacing.md)

                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gear")
                            .font(.title2)
                            .imageScale(.large)
                    }

                    Spacer(minLength: Theme.Spacing.md)

                    searchBar

                    Spacer(minLength: Theme.Spacing.md)

                    Button {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        showingAddCategory = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .imageScale(.large)
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
            .sheet(isPresented: $showingHistory) {
                HistorySheetView(history: repository.history)
                    .presentationDetents([.medium, .large])
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

    // MARK: - Subviews

    private var searchBar: some View {
        HStack(spacing: Theme.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Theme.Colors.textSecondary)

            TextField("Поиск", text: $searchQuery)
                .font(Theme.Typography.body)

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(Theme.Colors.textSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, Theme.Spacing.sm)
        .background(Theme.Colors.cardBackground)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Theme.Colors.separator.opacity(0.6), lineWidth: 0.5)
        )
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                // Логотип
                HStack(spacing: Theme.Spacing.sm) {
                    Image(systemName: "snowflake")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundColor(Theme.Colors.primary)
                    Text("FreezerApp")
                        .font(Theme.Typography.title)
                        .foregroundColor(Theme.Colors.textPrimary)
                }

                Spacer()

                Button {
                    withAnimation(expansionAnimation) {
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
        .padding(.horizontal, Theme.Spacing.lg)
        .padding(.top, Theme.Spacing.sm)
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

            Button {
                showingAddCategory = true
            } label: {
                Label("Добавить категорию", systemImage: "plus.circle.fill")
                    .font(Theme.Typography.callout)
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(Theme.Colors.primary.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .padding(.top, 64)
    }

    @ViewBuilder
    private func categoryBlock(for category: Category) -> some View {
        let isExpanded = expandedCategories.contains(category.id)
        let expandedBinding = Binding(
            get: { expandedCategories.contains(category.id) },
            set: { newValue in
                withAnimation(expansionAnimation) {
                    if newValue {
                        expandedCategories.insert(category.id)
                    } else {
                        expandedCategories.remove(category.id)
                    }
                }
            }
        )

        DisclosureGroup(isExpanded: expandedBinding) {
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
                            },
                            showSummaryText: false,
                            showActionButtons: false
                        )
                    }
                }

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
            .animation(expansionAnimation, value: expandedCategories)
        } label: {
            CategoryCard(
                category: category,
                isExpanded: isExpanded,
                onEdit: { editingCategory = category },
                onDelete: { repository.deleteCategory(category.id) },
                onLongPress: {
                    let impact = UIImpactFeedbackGenerator(style: .medium)
                    impact.impactOccurred()
                    withAnimation {
                        editMode = .active
                    }
                }
            )
        }
        .contentShape(Rectangle())
        .animation(expansionAnimation, value: expandedCategories)
        .disclosureGroupStyle(PlainDisclosureStyle(animation: expansionAnimation))
    }
}

private struct PlainDisclosureStyle: DisclosureGroupStyle {
    let animation: Animation

    func makeBody(configuration: Configuration) -> some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(animation) {
                    configuration.isExpanded.toggle()
                }
            } label: {
                configuration.label
            }
            .buttonStyle(.plain)

            if configuration.isExpanded {
                configuration.content
            }
        }
    }
}

// MARK: - History Sheet

private struct HistorySheetView: View {
    let history: [HistoryEvent]

    private var grouped: [(key: String, events: [HistoryEvent])] {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium

        let groupedDict = Dictionary(grouping: history.sorted(by: { $0.timestamp > $1.timestamp })) { event in
            formatter.string(from: event.timestamp)
        }
        return groupedDict
            .map { ($0.key, $0.value) }
            .sorted { $0.0 > $1.0 }
    }

    var body: some View {
        NavigationStack {
            List {
                if history.isEmpty {
                    Section {
                        VStack(spacing: Theme.Spacing.md) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 48))
                                .foregroundColor(Theme.Colors.textTertiary)
                            Text("История пуста")
                                .font(Theme.Typography.body)
                                .foregroundColor(Theme.Colors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, Theme.Spacing.xl)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    ForEach(grouped, id: \.key) { section in
                        Section(section.key) {
                            ForEach(section.events) { event in
                                HistoryRow(event: event)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("История")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct HistoryRow: View {
    let event: HistoryEvent

    private var subtitle: String {
        switch event.type {
        case .itemAdded:
            return "Добавлено"
        case .quantityChanged:
            var parts: [String] = []
            if let delta = event.packagesDelta, delta != 0 {
                parts.append("Уп: \(delta > 0 ? "+" : "")\(delta) → \(event.newPackages ?? 0)")
            }
            if let delta = event.itemsDelta, delta != 0 {
                parts.append("Шт: \(delta > 0 ? "+" : "")\(delta) → \(event.newItems ?? 0)")
            }
            return parts.isEmpty ? "Изменено" : parts.joined(separator: ", ")
        }
    }

    private var iconName: String {
        switch event.type {
        case .itemAdded:
            return "plus.circle.fill"
        case .quantityChanged:
            return "arrow.up.arrow.down.circle.fill"
        }
    }

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: event.timestamp)
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            Image(systemName: iconName)
                .foregroundColor(Theme.Colors.primary)
                .font(.system(size: 20, weight: .semibold))

            VStack(alignment: .leading, spacing: 4) {
                Text(event.itemName)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.Colors.textPrimary)

                Text(subtitle)
                    .font(Theme.Typography.subheadline)
                    .foregroundColor(Theme.Colors.textSecondary)
            }

            Spacer()

            Text(timeString)
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.Colors.textSecondary)
        }
        .padding(.vertical, Theme.Spacing.sm)
    }
}

#Preview {
    CategoryListView()
        .environmentObject(DataRepository())
}
