import Foundation

enum FeatureFlags {
    /// Developer toggle: controls iCloud key-value sync availability.
    /// true  - iCloud sync enabled and UI section visible.
    /// false - iCloud sync disabled and UI section hidden.
    static let is_icloud_sync_active = false
}
