import SwiftUI

struct ItemRow: View {
    let item: Item
    var onEdit: () -> Void
    var onDelete: () -> Void
    var onUpdatePackagesCount: (Int) -> Void
    var onUpdateItemsCount: (Int) -> Void
    var showSummaryText: Bool = true      // meta строка с количеством/описанием
    var showActionButtons: Bool = true    // нижние кнопки редактировать/удалить
    var showShelfPill: Bool = true        // бейдж полки

    private var expirationColor: Color {
        if item.isExpired {
            return Theme.Colors.error
        } else if item.isExpiringSoon {
            return Theme.Colors.warning
        } else {
            return Theme.Colors.success
        }
    }

    private var expirationIcon: String {
        if item.isExpired {
            return "exclamationmark.circle"
        } else if item.isExpiringSoon {
            return "exclamationmark.triangle"
        } else {
            return "checkmark.circle"
        }
    }

    private var expirationText: String {
        if item.isExpired {
            return "Просрочено"
        } else if item.isExpiringSoon {
            return "\(item.daysUntilExpiration) \(daysWord)"
        } else {
            return "Свежее"
        }
    }

    private var daysWord: String {
        let count = abs(item.daysUntilExpiration)
        if count % 10 == 1 && count % 100 != 11 { return "день" }
        if [2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100) { return "дня" }
        return "дней"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            HStack(alignment: .top, spacing: Theme.Spacing.md) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.name)
                        .font(Theme.Typography.headline)
                        .foregroundColor(Theme.Colors.textPrimary)

                    if showSummaryText || showShelfPill {
                        HStack(spacing: Theme.Spacing.sm) {
                            if showSummaryText {
                                Label("\(item.packagesCount) уп. • \(item.itemsCount) шт.", systemImage: "shippingbox")
                                    .font(Theme.Typography.subheadline)
                                    .foregroundColor(Theme.Colors.textSecondary)
                            }

                            if showShelfPill {
                                Text("Полка \(item.shelfNumber)")
                                    .font(Theme.Typography.caption)
                                    .foregroundColor(Theme.Colors.textPrimary)
                                    .padding(.horizontal, Theme.Spacing.sm)
                                    .padding(.vertical, Theme.Spacing.xs)
                                    .background(Theme.Colors.background)
                                    .clipShape(Capsule())
                            }
                        }
                    }

                    HStack(spacing: 6) {
                        Image(systemName: expirationIcon)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(expirationColor)
                        Text(expirationText)
                            .font(Theme.Typography.footnote)
                            .foregroundColor(expirationColor)
                    }

                    if let notes = item.notes, !notes.isEmpty {
                        Text(notes)
                            .font(Theme.Typography.footnote)
                            .foregroundColor(Theme.Colors.textSecondary)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: Theme.Spacing.lg)

                VStack(alignment: .trailing, spacing: Theme.Spacing.sm) {
                    counterRow(
                        title: "Уп.",
                        value: item.packagesCount,
                        onDecrement: { onUpdatePackagesCount(-1) },
                        onIncrement: { onUpdatePackagesCount(1) },
                        disableDecrement: item.packagesCount == 0
                    )

                    counterRow(
                        title: "Шт.",
                        value: item.itemsCount,
                        onDecrement: { onUpdateItemsCount(-1) },
                        onIncrement: { onUpdateItemsCount(1) },
                        disableDecrement: item.itemsCount == 0
                    )
                }
            }

            if showActionButtons {
                Divider()
                    .overlay(Theme.Colors.separator.opacity(0.3))

                HStack(spacing: Theme.Spacing.md) {
                    Button(action: onEdit) {
                        Label("Редактировать", systemImage: "pencil")
                            .font(Theme.Typography.callout)
                    }
                    .buttonStyle(.borderless)

                    Spacer()

                    Button(role: .destructive, action: onDelete) {
                        Label("Удалить", systemImage: "trash")
                            .font(Theme.Typography.callout)
                    }
                }
            }
        }
        .padding(Theme.Spacing.lg)
        .background(Theme.Colors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.CornerRadius.lg)
                .stroke(Theme.Colors.separator.opacity(0.4), lineWidth: 0.5)
        )
    }

    private func counterRow(
        title: String,
        value: Int,
        onDecrement: @escaping () -> Void,
        onIncrement: @escaping () -> Void,
        disableDecrement: Bool
    ) -> some View {
        HStack(spacing: Theme.Spacing.xs) {
            Text(title)
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.Colors.textSecondary)
                .frame(width: 28, alignment: .trailing)

            Button(action: onDecrement) {
                Image(systemName: "minus")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Theme.Colors.primary)
                    .frame(width: 30, height: 30)
                    .background(Theme.Colors.background)
                    .clipShape(Circle())
            }
            .buttonStyle(.borderless)
            .disabled(disableDecrement)
            .opacity(disableDecrement ? 0.5 : 1)

            Text("\(value)")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.Colors.textPrimary)
                .frame(width: 28)

            Button(action: onIncrement) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Theme.Colors.primary)
                    .frame(width: 30, height: 30)
                    .background(Theme.Colors.background)
                    .clipShape(Circle())
            }
            .buttonStyle(.borderless)
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        ItemRow(
            item: Item(
                name: "Куриный бульон",
                packagesCount: 2,
                itemsCount: 5,
                shelfNumber: 3,
                expirationDate: Calendar.current.date(byAdding: .month, value: 6, to: Date())!,
                notes: "Из домашней курицы",
                categoryId: "1"
            ),
            onEdit: {},
            onDelete: {},
            onUpdatePackagesCount: { _ in },
            onUpdateItemsCount: { _ in }
        )

        ItemRow(
            item: Item(
                name: "Малина",
                packagesCount: 1,
                itemsCount: 2,
                shelfNumber: 1,
                expirationDate: Calendar.current.date(byAdding: .day, value: 15, to: Date())!,
                categoryId: "1"
            ),
            onEdit: {},
            onDelete: {},
            onUpdatePackagesCount: { _ in },
            onUpdateItemsCount: { _ in }
        )
    }
    .padding()
    .background(Theme.Colors.background)
}
