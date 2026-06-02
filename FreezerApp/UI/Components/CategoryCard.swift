import SwiftUI

/// Home category header row — frosted "ice capsule" + name + count, with an
/// edit pencil and an expand/collapse chevron. The frosted card background is
/// applied by the parent (so embedded item previews share the same card).
struct CategoryCard: View {
    let category: Category
    var itemCount: Int
    var isExpanded: Bool = false
    var onOpen: () -> Void = {}
    var onToggle: () -> Void = {}
    var onEdit: () -> Void

    private var tintColor: Color {
        if let hex = category.color { return Color(hex: hex) }
        return AF.Color.accent
    }

    var body: some View {
        HStack(spacing: AF.Space.m) {
            HStack(spacing: AF.Space.m) {
                FrostCapsule(emoji: category.icon ?? "📦", tint: tintColor)

                VStack(alignment: .leading, spacing: 1) {
                    Text(category.name)
                        .font(AF.Typography.headline)
                        .foregroundStyle(AF.Color.textPrimary)
                    Text("\(itemCount) \(itemsWord)")
                        .font(AF.Typography.footnote)
                        .foregroundStyle(AF.Color.textTertiary)
                }
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
            .onTapGesture { onOpen() }

            Button(action: onEdit) {
                Image(systemName: "pencil")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(AF.Color.accent)
                    .frame(width: 30, height: 30)
                    .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)

            Button(action: onToggle) {
                Image(systemName: "chevron.down")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AF.Color.textTertiary)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
    }

    private var itemsWord: String {
        russianPlural(itemCount, one: "заготовка", few: "заготовки", many: "заготовок")
    }
}

#Preview {
    ZStack {
        ArcticBackdrop()
        VStack(spacing: 16) {
            CategoryCard(category: Category(name: "Овощи", icon: "🥬", color: "#0E9E8E", itemCount: 12),
                         itemCount: 12, onEdit: {})
                .padding(AF.Space.m)
                .afCard()
            CategoryCard(category: Category(name: "Мясо", icon: "🍖", color: "#E08ABF", itemCount: 8),
                         itemCount: 8, isExpanded: true, onEdit: {})
                .padding(AF.Space.m)
                .afCard()
        }
        .padding()
    }
}
