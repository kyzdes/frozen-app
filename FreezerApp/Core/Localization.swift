import SwiftUI

// Lightweight helpers to keep localized strings explicit in code.
func LK(_ key: String) -> LocalizedStringKey {
    LocalizedStringKey(key)
}

func LKS(_ key: String) -> String {
    NSLocalizedString(key, comment: "")
}

// MARK: - Russian Pluralization

/// Returns the correct Russian plural form for a given count.
/// - Parameters:
///   - count: The number to pluralize for.
///   - one: Form for 1, 21, 31… (e.g. "день", "заготовка").
///   - few: Form for 2-4, 22-24… (e.g. "дня", "заготовки").
///   - many: Form for 0, 5-20, 25-30… (e.g. "дней", "заготовок").
func russianPlural(_ count: Int, one: String, few: String, many: String) -> String {
    let abs = abs(count)
    let mod10 = abs % 10
    let mod100 = abs % 100
    if mod10 == 1 && mod100 != 11 { return one }
    if [2, 3, 4].contains(mod10) && ![12, 13, 14].contains(mod100) { return few }
    return many
}
