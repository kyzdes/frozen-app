import SwiftUI

struct ItemListView: View {
    @EnvironmentObject var repository: DataRepository
    @Environment(\.dismiss) private var dismiss
    @State private var showingAddItem = false
    @State private var editingItem: Item?
    @State private var searchQuery = ""
    @State private var selectedShelf: Int?
    @FocusState private var searchFocused: Bool

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

    private var tintColor: Color {
        if let hex = category.color { return Color(hex: hex) }
        return AF.Color.accent
    }

    var body: some View {
        ZStack {
            ArcticBackdrop()

            List {
                Section {
                    detailHeader
                        .listRowInsets(EdgeInsets(top: 4, leading: AF.Space.l, bottom: 4, trailing: AF.Space.l))
                    searchBar
                        .listRowInsets(EdgeInsets(top: 6, leading: AF.Space.l, bottom: 4, trailing: AF.Space.l))
                    if uniqueShelves.count > 1 {
                        shelfChips
                            .listRowInsets(EdgeInsets(top: 2, leading: AF.Space.l, bottom: 4, trailing: AF.Space.l))
                    }
                }
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)

                Section {
                    if filteredItems.isEmpty {
                        emptyStateView
                            .listRowInsets(EdgeInsets(top: 40, leading: AF.Space.l, bottom: 0, trailing: AF.Space.l))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    } else {
                        ForEach(filteredItems) { item in
                            ItemRow(
                                item: item,
                                onEdit: { editingItem = item },
                                onDelete: { withAnimation { repository.deleteItem(item.id) } },
                                onUpdatePackagesCount: { repository.updateItemPackagesCount(item.id, delta: $0) },
                                onUpdateItemsCount: { repository.updateItemItemsCount(item.id, delta: $0) }
                            )
                            .listRowInsets(EdgeInsets(top: 6, leading: AF.Space.l, bottom: 6, trailing: AF.Space.l))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    withAnimation { repository.deleteItem(item.id) }
                                } label: {
                                    Label("Удалить", systemImage: "trash")
                                }
                                Button {
                                    editingItem = item
                                } label: {
                                    Label("Изменить", systemImage: "pencil")
                                }
                                .tint(AF.Color.accent)
                            }
                        }
                    }

                    Color.clear.frame(height: 64)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.interactively)

            floatingAddButton
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { dismiss() } label: {
                    HStack(spacing: 2) {
                        Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold))
                        Text("Группы")
                    }
                    .foregroundStyle(AF.Color.accent)
                }
            }
        }
        .sheet(isPresented: $showingAddItem) {
            ItemFormView(item: nil, categoryId: category.id)
        }
        .sheet(item: $editingItem) { item in
            ItemFormView(item: item, categoryId: category.id)
        }
    }

    // MARK: - Subviews

    private var detailHeader: some View {
        HStack(spacing: AF.Space.m) {
            FrostCapsule(emoji: category.icon ?? "📦", tint: tintColor, size: 64)
            VStack(alignment: .leading, spacing: 2) {
                Text(category.name)
                    .font(AF.Typography.title3.weight(.bold))
                    .foregroundStyle(AF.Color.textPrimary)
                Text("\(items.count) \(itemsWord)")
                    .font(AF.Typography.subheadline)
                    .foregroundStyle(AF.Color.textTertiary)
            }
            Spacer()
        }
        .padding(.top, 4)
    }

    private var searchBar: some View {
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
    }

    private var shelfChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AF.Space.s) {
                AFChip(title: "Все полки", isActive: selectedShelf == nil) { selectedShelf = nil }
                ForEach(uniqueShelves, id: \.self) { shelf in
                    AFChip(title: "Полка \(shelf)", isActive: selectedShelf == shelf) {
                        selectedShelf = (selectedShelf == shelf) ? nil : shelf
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: AF.Space.m) {
            Text("🧊")
                .font(.system(size: 30))
                .frame(width: 64, height: 64)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))
            Text(items.isEmpty ? "В группе пока нет заготовок" : "Ничего не найдено")
                .font(AF.Typography.body)
                .foregroundStyle(AF.Color.textSecondary)
            Text(items.isEmpty ? "Нажмите +, чтобы добавить первую заготовку" : "Попробуйте изменить запрос")
                .font(AF.Typography.subheadline)
                .foregroundStyle(AF.Color.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    private var floatingAddButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    showingAddItem = true
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

    private var itemsWord: String {
        russianPlural(items.count, one: "заготовка", few: "заготовки", many: "заготовок")
    }
}

#Preview {
    NavigationStack {
        ItemListView(category: Category.sampleCategories[0])
            .environmentObject(DataRepository())
    }
}
