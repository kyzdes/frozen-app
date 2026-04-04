import SwiftUI

struct HistoryView: View {
    let history: [HistoryEvent]
    @State private var selectedDate: Date? = nil
    @State private var sortDescending: Bool = true

    private var filteredHistory: [HistoryEvent] {
        let calendar = Calendar.current
        let sorted = history.sorted { sortDescending ? $0.timestamp > $1.timestamp : $0.timestamp < $1.timestamp }

        guard let date = selectedDate else { return sorted }

        return sorted.filter { event in
            calendar.isDate(event.timestamp, inSameDayAs: date)
        }
    }

    private var grouped: [(key: String, events: [HistoryEvent])] {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium

        let groupedDict = Dictionary(grouping: filteredHistory) { event in
            formatter.string(from: event.timestamp)
        }
        return groupedDict
            .map { ($0.key, $0.value) }
            .sorted { sortDescending ? $0.0 > $1.0 : $0.0 < $1.0 }
    }

    var body: some View {
        List {
            controls

            if filteredHistory.isEmpty {
                Section {
                    VStack(spacing: Theme.Spacing.md) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.Colors.textTertiary)
                        Text(LK("История пуста"))
                            .font(Theme.Typography.body)
                            .foregroundColor(Theme.Colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, Theme.Spacing.xl)
                    .listRowSeparator(.hidden)
                }
            } else {
                ForEach(grouped, id: \.key) { section in
                    Section(section.key) {
                        ForEach(section.events) { event in
                            HistoryRow(event: event)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(LK("История"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private var controls: some View {
        Section {
            HStack {
                Text(LK("Сортировка"))
                    .foregroundColor(Theme.Colors.textSecondary)
                    .font(Theme.Typography.subheadline)

                Spacer()

                Picker("", selection: $sortDescending) {
                    Text(LK("Новые")).tag(true)
                    Text(LK("Старые")).tag(false)
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
            }

            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                Text(LK("Фильтр по дате"))
                    .foregroundColor(Theme.Colors.textSecondary)
                    .font(Theme.Typography.subheadline)

                HStack {
                    DatePicker(
                        "",
                        selection: Binding(
                            get: { selectedDate ?? Date() },
                            set: { newValue in selectedDate = newValue }
                        ),
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .disabled(false)

                    Button {
                        withAnimation { selectedDate = nil }
                    } label: {
                        HStack(spacing: Theme.Spacing.xs) {
                            Image(systemName: "arrow.uturn.backward.circle")
                            Text(LK("Сбросить"))
                        }
                        .font(Theme.Typography.caption)
                    }
                    .buttonStyle(.borderless)
                    .disabled(selectedDate == nil)
                }
            }
        }
    }
}

struct HistoryRow: View {
    let event: HistoryEvent

    private var subtitle: String {
        switch event.type {
        case .itemAdded:
            return LKS("Добавлено")
        case .itemUpdated:
            return LKS("Обновлено")
        case .itemDeleted:
            return LKS("Удалено")
        case .packagesChanged:
            if let delta = event.packagesDelta {
                return "\(LKS("Упаковки изменены")): \(delta > 0 ? "+" : "")\(delta)"
            }
            return LKS("Упаковки изменены")
        case .itemsChanged:
            if let delta = event.itemsDelta {
                return "\(LKS("Количество изменено")): \(delta > 0 ? "+" : "")\(delta)"
            }
            return LKS("Количество изменено")
        }
    }

    private var iconName: String {
        switch event.type {
        case .itemAdded:
            return "plus.circle.fill"
        case .itemUpdated:
            return "pencil.circle.fill"
        case .itemDeleted:
            return "trash.circle.fill"
        case .packagesChanged, .itemsChanged:
            return "arrow.up.arrow.down.circle.fill"
        }
    }

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: event.timestamp)
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            Image(systemName: iconName)
                .foregroundColor(Theme.Colors.primary)
                .font(.system(size: 20, weight: .semibold))

            VStack(alignment: .leading, spacing: 4) {
                Text(event.itemName)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.Colors.textPrimary)

                Text(subtitle)
                    .font(Theme.Typography.subheadline)
                    .foregroundColor(Theme.Colors.textSecondary)
            }

            Spacer()

            Text(timeString)
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.Colors.textSecondary)
        }
        .padding(.vertical, Theme.Spacing.sm)
    }
}
