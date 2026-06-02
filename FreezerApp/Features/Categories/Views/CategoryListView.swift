import SwiftUI
import UIKit

struct CategoryListView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var showingAddCategory = false
    @State private var editingCategory: Category?
    @State private var expandedCategories: Set<String> = []
    @State private var searchQuery = ""
    @State private var selectedShelf: Int?
    @State private var navCategory: Category?
    @FocusState private var searchFocused: Bool
    private let expansionAnimation = Animation.spring(response: 0.32, dampingFraction: 0.85, blendDuration: 0.12)

    var body: some View {
        ZStack {
            ArcticBackdrop()

            ScrollView {
                LazyVStack(alignment: .leading, spacing: AF.Space.m) {
                    header
                    toolbar
                    if !uniqueShelves.isEmpty { shelfChips }

                    if repository.categories.isEmpty {
                        emptyStateView
                    } else {
                        ForEach(filteredCategories) { category in
                            categoryBlock(for: category)
                        }
                    }
                }
                .padding(.horizontal, AF.Space.l)
                .padding(.top, AF.Space.s)
                .padding(.bottom, 96)
            }
            .scrollDismissesKeyboard(.interactively)

            floatingAddButton
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(item: $navCategory) { category in
            ItemListView(category: category)
        }
        .sheet(isPresented: $showingAddCategory) {
            CategoryFormView(category: nil)
        }
        .sheet(item: $editingCategory) { category in
            CategoryFormView(category: category)
        }
    }

    // MARK: - Derived

    private var totalItems: Int {
        repository.categories.reduce(0) { $0 + repository.getItems(for: $1.id).count }
    }

    private var itemsWord: String {
        russianPlural(totalItems, one: "заготовка", few: "заготовки", many: "заготовок")
    }

    private var categoriesWord: String {
        russianPlural(repository.categories.count, one: "группа", few: "группы", many: "групп")
    }

    private var allExpanded: Bool {
        !repository.categories.isEmpty && expandedCategories.count == repository.categories.count
    }

    private var allItems: [Item] { repository.items }

    private var uniqueShelves: [Int] {
        Array(Set(allItems.map { $0.shelfNumber })).sorted()
    }

    private func matches(_ item: Item) -> Bool {
        let okQuery = searchQuery.isEmpty ||
            item.name.localizedCaseInsensitiveContains(searchQuery) ||
            (item.notes?.localizedCaseInsensitiveContains(searchQuery) ?? false)
        let okShelf = selectedShelf == nil || item.shelfNumber == selectedShelf
        return okQuery && okShelf
    }

    private var filteredCategories: [Category] {
        if searchQuery.isEmpty && selectedShelf == nil { return repository.categories }
        let categoryIds = Set(allItems.filter { matches($0) }.map { $0.categoryId })
        return repository.categories.filter { category in
            categoryIds.contains(category.id) || category.name.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 8) {
                    Text("❄️")
                        .font(.system(size: 28))
                        .shadow(color: AF.Color.accentSoft, radius: 6, x: 0, y: 2)
                    Text("Морозилка")
                        .font(AF.Typography.largeTitle)
                        .foregroundStyle(AF.Color.textPrimary)
                }
                Spacer()
                if !repository.categories.isEmpty {
                    Button {
                        withAnimation(expansionAnimation) {
                            expandedCategories = allExpanded ? [] : Set(repository.categories.map { $0.id })
                        }
                    } label: {
                        Text(allExpanded ? "Свернуть" : "Развернуть")
                            .font(AF.Typography.callout)
                            .foregroundStyle(AF.Color.accent)
                    }
                }
            }

            Text("\(totalItems) \(itemsWord) · \(repository.categories.count) \(categoriesWord)")
                .font(AF.Typography.subheadline)
                .foregroundStyle(AF.Color.textSecondary)
        }
        .padding(.top, 4)
        .padding(.bottom, 6)
    }

    private var toolbar: some View {
        HStack(spacing: AF.Space.s) {
            HStack(spacing: 7) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundStyle(AF.Color.textTertiary)
                TextField("Поиск по заготовкам", text: $searchQuery)
                    .font(AF.Typography.callout)
                    .foregroundStyle(AF.Color.textPrimary)
                    .focused($searchFocused)
                if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                        searchFocused = false
                    } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(AF.Color.textTertiary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, AF.Space.m)
            .frame(height: 38)
            .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: AF.Radius.control, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: AF.Radius.control, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))

            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                showingAddCategory = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AF.Color.accent)
                    .frame(width: 38, height: 38)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: AF.Radius.control, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: AF.Radius.control, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))
            }
            .buttonStyle(.plain)
        }
    }

    private var shelfChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AF.Space.s) {
                AFChip(title: "Все полки", systemImage: "line.3.horizontal.decrease", isActive: selectedShelf == nil) {
                    selectedShelf = nil
                }
                ForEach(uniqueShelves, id: \.self) { shelf in
                    AFChip(title: "Полка \(shelf)", isActive: selectedShelf == shelf) {
                        selectedShelf = (selectedShelf == shelf) ? nil : shelf
                    }
                }
            }
            .padding(.vertical, 2)
        }
        .padding(.bottom, 2)
    }

    // MARK: - Category block

    @ViewBuilder
    private func categoryBlock(for category: Category) -> some View {
        let isExpanded = expandedCategories.contains(category.id)
        let preview = repository.getItems(for: category.id).filter { matches($0) }

        VStack(spacing: 0) {
            CategoryCard(
                category: category,
                itemCount: repository.getItems(for: category.id).count,
                isExpanded: isExpanded,
                onOpen: { navCategory = category },
                onToggle: {
                    withAnimation(expansionAnimation) {
                        if isExpanded { expandedCategories.remove(category.id) }
                        else { expandedCategories.insert(category.id) }
                    }
                },
                onEdit: { editingCategory = category }
            )

            if isExpanded {
                VStack(spacing: 2) {
                    Divider().overlay(AF.Color.hairline).padding(.vertical, 4)

                    if preview.isEmpty {
                        Text("В группе пока нет заготовок")
                            .font(AF.Typography.footnote)
                            .foregroundStyle(AF.Color.textTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                    } else {
                        ForEach(preview.prefix(4)) { item in
                            Button { navCategory = category } label: {
                                HStack {
                                    Text(item.name)
                                        .font(AF.Typography.callout)
                                        .foregroundStyle(AF.Color.textPrimary)
                                    Spacer()
                                    FreshnessBadge(daysLeft: item.daysUntilExpiration, style: .short)
                                }
                                .padding(.vertical, 9)
                                .padding(.horizontal, 8)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }

                        Button { navCategory = category } label: {
                            HStack(spacing: 6) {
                                Text("Открыть полный список")
                                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold))
                            }
                            .font(AF.Typography.subheadline.weight(.semibold))
                            .foregroundStyle(AF.Color.accent)
                            .frame(maxWidth: .infinity)
                            .frame(height: 38)
                            .background(AF.Color.accentSoft, in: RoundedRectangle(cornerRadius: AF.Radius.button, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                }
            }
        }
        .padding(AF.Space.m)
        .afCard()
    }

    // MARK: - Empty + FAB

    private var emptyStateView: some View {
        VStack(spacing: AF.Space.m) {
            Text("🧊")
                .font(.system(size: 30))
                .frame(width: 64, height: 64)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))

            Text("Пока нет групп")
                .font(AF.Typography.body)
                .foregroundStyle(AF.Color.textSecondary)
            Text("Нажмите +, чтобы создать первую группу")
                .font(AF.Typography.subheadline)
                .foregroundStyle(AF.Color.textTertiary)
                .multilineTextAlignment(.center)

            Button("Новая группа") { showingAddCategory = true }
                .buttonStyle(AFTintedButtonStyle(fullWidth: false))
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 64)
    }

    private var floatingAddButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    showingAddCategory = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(AF.Color.onAccent)
                        .frame(width: 56, height: 56)
                        .background(AF.accentGradient, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .strokeBorder(.white.opacity(0.45), lineWidth: 0.5).blendMode(.plusLighter)
                        )
                        .shadow(color: AF.Color.accent.opacity(0.5), radius: 16, x: 0, y: 10)
                }
                .buttonStyle(.plain)
                .padding(.trailing, AF.Space.l)
                .padding(.bottom, AF.Space.l)
            }
        }
    }
}

#Preview {
    NavigationStack {
        CategoryListView()
            .environmentObject(DataRepository())
    }
}
