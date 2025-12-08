import SwiftUI

struct CategoryCard: View {
    let category: Category
    var isExpanded: Bool = false
    var onEdit: () -> Void
    var onDelete: () -> Void
    var onLongPress: (() -> Void)? = nil

    private var backgroundColor: Color {
        Theme.Colors.cardBackground
    }

    private var iconBackgroundColor: Color {
        if let colorHex = category.color { return Color(hex: colorHex) }
        return Theme.Colors.primary.opacity(0.9)
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: Theme.CornerRadius.lg)
                    .fill(iconBackgroundColor.opacity(0.18))
                    .frame(width: 52, height: 52)

                Text(category.icon ?? "📦")
                    .font(.system(size: 24, weight: .medium))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(category.name)
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.Colors.textPrimary)

                Text("\(category.itemCount) \(itemsWord)")
                    .font(Theme.Typography.footnote)
                    .foregroundColor(Theme.Colors.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.\(isExpanded ? "up" : "down")")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.Colors.textTertiary)
                .rotationEffect(.degrees(isExpanded ? 0 : 0))
                .animation(.easeInOut(duration: 0.2), value: isExpanded)

            Menu {
                Button("Редактировать", systemImage: "pencil", action: onEdit)
                Button("Удалить", role: .destructive, action: onDelete)
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(Theme.Colors.textSecondary)
            }
            .buttonStyle(.borderless)
        }
        .padding(.vertical, Theme.Spacing.md)
        .padding(.horizontal, Theme.Spacing.lg)
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.CornerRadius.lg)
                .stroke(Theme.Colors.separator.opacity(0.6), lineWidth: 0.5)
        )
        .onLongPressGesture(minimumDuration: 0.6) {
            onLongPress?()
        }
        .contextMenu {
            Button("Редактировать", systemImage: "pencil", action: onEdit)
            Button("Удалить", role: .destructive, action: onDelete)
        }
    }

    private var itemsWord: String {
        let count = category.itemCount
        if count % 10 == 1 && count % 100 != 11 { return "заготовка" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "заготовки" }
        return "заготовок"
    }
}

#Preview {
    VStack(spacing: 16) {
        CategoryCard(
            category: Category(name: "Овощи", icon: "🥬", color: "#34C759", itemCount: 12),
            onEdit: {},
            onDelete: {}
        )
        CategoryCard(
            category: Category(name: "Мясо", icon: "🍖", color: "#FF3B30", itemCount: 8),
            onEdit: {},
            onDelete: {}
        )
    }
    .padding()
    .background(Theme.Colors.background)
}
