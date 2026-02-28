import SwiftUI

struct ItemRow: View {
    let item: Item
    var onEdit: () -> Void
    var onDelete: () -> Void
    var onUpdatePackagesCount: (Int) -> Void
    var onUpdateItemsCount: (Int) -> Void

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
        russianPlural(item.daysUntilExpiration, one: "день", few: "дня", many: "дней")
    }

    var body: some View {
        HStack(alignment: .top, spacing: Theme.Spacing.md) {
            // Content
            VStack(alignment: .leading, spacing: 8) {
                // Title with Edit Button
                HStack {
                    Text(item.name)
                        .font(Theme.Typography.body)
                        .foregroundColor(Theme.Colors.textPrimary)

                    Spacer()

                    Button {
                        onEdit()
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 28, height: 28)
                            .background(Theme.Colors.background.opacity(0.5))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }

                // Info
                HStack(spacing: Theme.Spacing.md) {
                    Text("\(item.packagesCount) уп. • \(item.itemsCount) шт.")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.Colors.textSecondary)

                    Text("Полка \(item.shelfNumber)")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.Colors.textSecondary)
                }

                // Expiration Status
                HStack(spacing: 4) {
                    Image(systemName: expirationIcon)
                        .font(.system(size: 12))
                        .foregroundColor(expirationColor)

                    Text(expirationText)
                        .font(Theme.Typography.footnote)
                        .foregroundColor(expirationColor)
                }

                // Notes
                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(Theme.Typography.footnote)
                        .foregroundColor(Theme.Colors.textSecondary)
                        .lineLimit(2)
                }
            }

            // Quantity Controls
            VStack(alignment: .trailing, spacing: Theme.Spacing.sm) {
                // Packages Controls
                HStack(spacing: Theme.Spacing.xs) {
                    Text("Уп.")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.Colors.textSecondary)
                        .frame(width: 28, alignment: .trailing)

                    Button {
                        onUpdatePackagesCount(-1)
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 28, height: 28)
                            .background(Theme.Colors.background)
                            .clipShape(Circle())
                    }
                    .disabled(item.packagesCount == 0)

                    Text("\(item.packagesCount)")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.Colors.textPrimary)
                        .frame(width: 28)

                    Button {
                        onUpdatePackagesCount(1)
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 28, height: 28)
                            .background(Theme.Colors.background)
                            .clipShape(Circle())
                    }
                }

                // Items Controls
                HStack(spacing: Theme.Spacing.xs) {
                    Text("Шт.")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.Colors.textSecondary)
                        .frame(width: 28, alignment: .trailing)

                    Button {
                        onUpdateItemsCount(-1)
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 28, height: 28)
                            .background(Theme.Colors.background)
                            .clipShape(Circle())
                    }
                    .disabled(item.itemsCount == 0)

                    Text("\(item.itemsCount)")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.Colors.textPrimary)
                        .frame(width: 28)

                    Button {
                        onUpdateItemsCount(1)
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Theme.Colors.primary)
                            .frame(width: 28, height: 28)
                            .background(Theme.Colors.background)
                            .clipShape(Circle())
                    }
                }
            }
        }
        .padding(Theme.Spacing.lg)
        .background(Theme.Colors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Theme.CornerRadius.lg))
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
