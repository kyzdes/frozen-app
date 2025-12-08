import SwiftUI
import UIKit

struct Theme {
    // MARK: - Colors
    struct Colors {
        // Системные цвета дают более нативный вид на iOS
        static let primary = Color(.systemBlue)
        static let background = Color(.systemGroupedBackground)
        static let cardBackground = Color(.secondarySystemGroupedBackground)
        static let textPrimary = Color(.label)
        static let textSecondary = Color(.secondaryLabel)
        static let textTertiary = Color(.tertiaryLabel)
        static let separator = Color(.separator)
        static let success = Color(.systemGreen)
        static let warning = Color(.systemOrange)
        static let error = Color(.systemRed)
        static let purple = Color(.systemPurple)
        static let pink = Color(.systemPink)
        static let yellow = Color(.systemYellow)
        static let cyan = Color(.systemTeal)
    }

    // MARK: - Preset Icons & Colors
    static let presetIcons = [
        "🥬", "🥕", "🥦", "🧅", "🍅", "🥒",
        "🍖", "🥩", "🍗", "🥓", "🍤", "🐟",
        "🫐", "🍓", "🍒", "🍇", "🫙", "🍋",
        "🥟", "🥠", "🍝", "🥧", "🧁", "🍰",
        "🥣", "🍜", "🥘", "🥫", "🧈", "🧊"
    ]

    static let presetColors = [
        "#34C759", "#FF3B30", "#AF52DE", "#5B9FD3",
        "#FF9500", "#FFCC00", "#FF2D55", "#5AC8FA"
    ]

    // MARK: - Typography
    struct Typography {
        static let largeTitle: Font = .system(.largeTitle, design: .rounded)
        static let title: Font = .system(.title, design: .rounded)
        static let headline: Font = .system(.headline, design: .rounded)
        static let body: Font = .system(.body, design: .rounded)
        static let callout: Font = .system(.callout, design: .rounded)
        static let subheadline: Font = .system(.subheadline, design: .rounded)
        static let footnote: Font = .system(.footnote, design: .rounded)
        static let caption: Font = .system(.caption, design: .rounded)
    }

    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    // MARK: - Corner Radius
    struct CornerRadius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    init(light: String, dark: String) {
        self.init(uiColor: UIColor(light: UIColor(hexString: light), dark: UIColor(hexString: dark)))
    }

    func withOpacity(_ opacity: Double) -> Color {
        self.opacity(opacity)
    }

    func toHexString() -> String? {
        #if canImport(UIKit)
        let uiColor = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        guard uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return nil }
        let r = Int(red * 255)
        let g = Int(green * 255)
        let b = Int(blue * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
        #else
        return nil
        #endif
    }
}

// MARK: - UIColor Extension
extension UIColor {
    convenience init(light: UIColor, dark: UIColor) {
        self.init { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return dark
            default:
                return light
            }
        }
    }

    convenience init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}
