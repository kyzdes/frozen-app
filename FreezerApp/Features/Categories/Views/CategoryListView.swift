import SwiftUI
import UIKit

struct CategoryListView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var showingAddCategory = false
    @State private var editingCategory: Category?
    @State private var editMode: EditMode = .inactive

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
                            .listRowInsets(EdgeInsets(top: Theme.Spacing.sm, leading: Theme.Spacing.lg, bottom: Theme.Spacing.md, trailing: Theme.Spacing.lg))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                        }

                        // Categories Section
                        Section {
                            ForEach(repository.categories) { category in
                                NavigationLink(value: category) {
                                    CategoryCard(
                                        category: category,
                                        onEdit: { editingCategory = category },
                                        onLongPress: {
                                            let impact = UIImpactFeedbackGenerator(style: .medium)
                                            impact.impactOccurred()
                                            withAnimation {
                                                editMode = .active
                                            }
                                        }
                                    )
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
