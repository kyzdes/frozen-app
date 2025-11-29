import SwiftUI

struct CategoryListView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var showingAddCategory = false
    @State private var editingCategory: Category?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Colors.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                        // Header
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
                        .padding(.horizontal, Theme.Spacing.lg)
                        .padding(.top, Theme.Spacing.sm)

                        // Categories List
                        if repository.categories.isEmpty {
                            emptyStateView
                        } else {
                            LazyVStack(spacing: Theme.Spacing.sm) {
                                ForEach(repository.categories) { category in
                                    NavigationLink(value: category) {
                                        CategoryCard(
                                            category: category,
                                            onEdit: { editingCategory = category }
                                        )
                                    }
                                    .buttonStyle(.plain)
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
                            showingAddCategory = true
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
            .navigationDestination(for: Category.self) { category in
                ItemListView(category: category)
            }
            .sheet(isPresented: $showingAddCategory) {
                CategoryFormView(category: nil)
            }
            .sheet(item: $editingCategory) { category in
                CategoryFormView(category: category)
            }
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
}

#Preview {
    CategoryListView()
        .environmentObject(DataRepository())
}
