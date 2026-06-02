import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var repository: DataRepository
    @State private var selectedDate: Date? = nil
    @State private var sortDescending: Bool = true

    private var history: [HistoryEvent] { repository.history }

    private var filteredHistory: [HistoryEvent] {
        let calendar = Calendar.current
        let sorted = history.sorted { sortDescending ? $0.timestamp > $1.timestamp : $0.timestamp < $1.timestamp }
        guard let date = selectedDate else { return sorted }
        return sorted.filter { calendar.isDate($0.timestamp, inSameDayAs: date) }
    }

    private var grouped: [(day: Date, title: String, events: [HistoryEvent])] {
        let calendar = Calendar.current
        let groupedDict = Dictionary(grouping: filteredHistory) { calendar.startOfDay(for: $0.timestamp) }
        return groupedDict
            .map { (day: $0.key, title: HistoryView.dayTitle($0.key), events: $0.value) }
            .sorted { sortDescending ? $0.day > $1.day : $0.day < $1.day }
    }

    var body: some View {
        ZStack {
            ArcticBackdrop()

            List {
                controls

                if filteredHistory.isEmpty {
                    Section {
                        VStack(spacing: AF.Space.m) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 44))
                                .foregroundStyle(AF.Color.textTertiary)
                            Text("История пуста")
                                .font(AF.Typography.body)
                                .foregroundStyle(AF.Color.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, AF.Space.xl)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                } else {
                    ForEach(grouped, id: \.day) { section in
                        Section {
                            ForEach(section.events) { event in
                                HistoryRow(event: event, categoryName: categoryName(for: event))
                                    .listRowBackground(rowBackground)
                                    .listRowSeparatorTint(AF.Color.hairline)
                            }
                        } header: {
                            Text(section.title)
                                .font(AF.Typography.footnote.weight(.semibold))
                                .foregroundStyle(AF.Color.textTertiary)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("История")
        .navigationBarTitleDisplayMode(.large)
    }

    private var controls: some View {
        Section {
            HStack {
                Text("Сортировка")
                    .font(AF.Typography.subheadline)
                    .foregroundStyle(AF.Color.textSecondary)
                Spacer()
                Picker("", selection: $sortDescending) {
                    Text("Новые").tag(true)
                    Text("Старые").tag(false)
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
            }

            HStack {
                DatePicker(
                    "Фильтр по дате",
                    selection: Binding(get: { selectedDate ?? Date() }, set: { selectedDate = $0 }),
                    displayedComponents: .date
                )
                .font(AF.Typography.subheadline)
                .tint(AF.Color.accent)

                if selectedDate != nil {
                    Button {
                        withAnimation { selectedDate = nil }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(AF.Color.textTertiary)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .listRowBackground(rowBackground)
    }

    private var rowBackground: some View {
        Rectangle().fill(.ultraThinMaterial)
    }

    private func categoryName(for event: HistoryEvent) -> String? {
        guard let id = event.categoryId else { return nil }
        return repository.categories.first { $0.id == id }?.name
    }

    static func dayTitle(_ day: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(day) { return "Сегодня" }
        if calendar.isDateInYesterday(day) { return "Вчера" }
        let f = DateFormatter()
        f.locale = Locale(identifier: Locale.preferredLanguages.first ?? "ru")
        f.dateFormat = "d MMMM"
        return f.string(from: day)
    }
}

struct HistoryRow: View {
    let event: HistoryEvent
    var categoryName: String? = nil

    private var iconName: String {
        switch event.type {
        case .itemAdded: return "plus"
        case .itemUpdated: return "pencil"
        case .itemDeleted: return "trash"
        case .packagesChanged, .itemsChanged: return "arrow.up.arrow.down"
        }
    }

    private var iconColor: Color {
        switch event.type {
        case .itemAdded: return AF.Color.fresh
        case .itemUpdated: return AF.Color.accent
        case .itemDeleted: return AF.Color.expired
        case .packagesChanged, .itemsChanged: return AF.Color.soon
        }
    }

    private var subtitle: String {
        let time = HistoryRow.timeString(event.timestamp)
        if let categoryName { return "\(categoryName) · \(time)" }
        return time
    }

    var body: some View {
        HStack(spacing: AF.Space.m) {
            Image(systemName: iconName)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(iconColor)
                .frame(width: 34, height: 34)
                .background(AF.Color.fillSecondary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(event.displayText)
                    .font(AF.Typography.callout.weight(.medium))
                    .foregroundStyle(AF.Color.textPrimary)
                Text(subtitle)
                    .font(AF.Typography.caption)
                    .foregroundStyle(AF.Color.textTertiary)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    static func timeString(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: Locale.preferredLanguages.first ?? "ru")
        f.timeStyle = .short
        f.dateStyle = .none
        return f.string(from: date)
    }
}

#Preview {
    NavigationStack {
        HistoryView()
            .environmentObject(DataRepository())
    }
}
