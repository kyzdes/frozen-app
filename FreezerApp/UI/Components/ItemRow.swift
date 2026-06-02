import SwiftUI

/// Detail-screen item card — frosted glass with title, meta line, optional
/// notes, a freshness badge and an iOS-pill quantity stepper (packages).
struct ItemRow: View {
    let item: Item
    var onEdit: () -> Void
    var onDelete: () -> Void
    var onUpdatePackagesCount: (Int) -> Void
    var onUpdateItemsCount: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AF.Space.m) {
            // Title + edit
            HStack(alignment: .top, spacing: AF.Space.m) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.name)
                        .font(AF.Typography.headline)
                        .foregroundStyle(AF.Color.textPrimary)

                    HStack(spacing: 6) {
                        Text("\(item.packagesCount) уп.")
                        sep
                        Text("\(item.itemsCount) шт.")
                        sep
                        Text("Полка \(item.shelfNumber)")
                    }
                    .font(AF.Typography.footnote)
                    .foregroundStyle(AF.Color.textTertiary)
                }

                Spacer(minLength: 0)

                Button(action: onEdit) {
                    Image(systemName: "pencil")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(AF.Color.accent)
                        .frame(width: 30, height: 30)
                        .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            if let notes = item.notes, !notes.isEmpty {
                Text(notes)
                    .font(AF.Typography.footnote)
                    .foregroundStyle(AF.Color.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 7)
                    .padding(.horizontal, 10)
                    .background(AF.Color.fillTertiary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            // Freshness + packages stepper
            HStack {
                FreshnessBadge(daysLeft: item.daysUntilExpiration, style: .short)
                Spacer()
                AFStepper(value: item.packagesCount, leadingLabel: "Уп.") { newValue in
                    onUpdatePackagesCount(newValue - item.packagesCount)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .afCard()
    }

    private var sep: some View {
        Text("·").foregroundStyle(AF.Color.textTertiary.opacity(0.5))
    }
}

#Preview {
    ZStack {
        ArcticBackdrop()
        VStack(spacing: 16) {
            ItemRow(
                item: Item(name: "Куриный бульон", packagesCount: 2, itemsCount: 5, shelfNumber: 3,
                           expirationDate: Calendar.current.date(byAdding: .month, value: 6, to: Date())!,
                           notes: "Из домашней курицы", categoryId: "1"),
                onEdit: {}, onDelete: {}, onUpdatePackagesCount: { _ in }, onUpdateItemsCount: { _ in }
            )
            ItemRow(
                item: Item(name: "Фарш говяжий", packagesCount: 0, itemsCount: 1, shelfNumber: 3,
                           expirationDate: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
                           categoryId: "1"),
                onEdit: {}, onDelete: {}, onUpdatePackagesCount: { _ in }, onUpdateItemsCount: { _ in }
            )
        }
        .padding()
    }
}
