import SwiftUI

struct CategoryCard: View {
    let category: Category
    var isExpanded: Bool = false
    var onEdit: () -> Void
    var onLongPress: (() -> Void)? = nil

    private var backgroundColor: Color {
        if let colorHex = category.color {
            return Color(hex: colorHex).opacity(0.15)
        }
        return Theme.Colors.primary.opacity(0.15)
    }

    private var iconBackgroundColor: Color {
        if let colorHex = category.color {
            return Color(hex: colorHex)
        }
        return Theme.Colors.primary
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: Theme.CornerRadius.md)
                    .fill(iconBackgroundColor)
                    .frame(width: 48, height: 48)

                Text(category.icon ?? "📦")
                    .font(.system(size: 24))
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(category.name)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.Colors.textPrimary)

                Text("\(category.itemCount) \(itemsWord)")
                    .font(Theme.Typography.subheadline)
                    .foregroundColor(Theme.Colors.textSecondary)
            }

            Spacer()

            // Expand/Collapse Indicator
            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.Colors.textTertiary)
                .frame(width: 20, height: 20)

            // Edit Button
            Button {
                onEdit()
            } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 16))
                    .foregroundColor(Theme.Colors.primary)
                    .frame(width: 32, height: 32)
                    .background(Theme.Colors.background.opacity(0.5))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.borderless)
        }
        .padding(Theme.Spacing.lg)
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.lg))
        .onLongPressGesture(minimumDuration: 0.6) {
            onLongPress?()
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
            onEdit: {}
        )
        CategoryCard(
            category: Category(name: "Мясо", icon: "🍖", color: "#FF3B30", itemCount: 8),
            onEdit: {}
        )
    }
    .padding()
    .background(Theme.Colors.background)
}
