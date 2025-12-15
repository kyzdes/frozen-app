import SwiftUI

// Lightweight helpers to keep localized strings explicit in code.
func LK(_ key: String) -> LocalizedStringKey {
    LocalizedStringKey(key)
}

func LKS(_ key: String) -> String {
    NSLocalizedString(key, comment: "")
}
