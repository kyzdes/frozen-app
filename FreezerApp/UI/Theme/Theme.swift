import SwiftUI
import UIKit

struct Theme {
    // MARK: - Colors
    struct Colors {
        static let primary = Color(light: "#5B9FD3", dark: "#64A9DC")
        static let background = Color(light: "#F2F7FA", dark: "#000000")
        static let cardBackground = Color(light: "#FFFFFF", dark: "#1C1C1E")
        static let textPrimary = Color(light: "#1C1C1E", dark: "#FFFFFF")
        static let textSecondary = Color(light: "#8E8E93", dark: "#8E8E93")
        static let textTertiary = Color(light: "#C7C7CC", dark: "#48484A")
        static let success = Color(hex: "#34C759")
        static let warning = Color(hex: "#FF9500")
        static let error = Color(hex: "#FF3B30")
        static let purple = Color(hex: "#AF52DE")
        static let pink = Color(hex: "#FF2D55")
        static let yellow = Color(hex: "#FFCC00")
        static let cyan = Color(hex: "#5AC8FA")
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
        static let largeTitle: Font = .system(size: 34, weight: .regular)
        static let title: Font = .system(size: 28, weight: .semibold)
        static let headline: Font = .system(size: 17, weight: .semibold)
        static let body: Font = .system(size: 17, weight: .regular)
        static let callout: Font = .system(size: 16, weight: .regular)
        static let subheadline: Font = .system(size: 15, weight: .regular)
        static let footnote: Font = .system(size: 13, weight: .regular)
        static let caption: Font = .system(size: 12, weight: .regular)
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
