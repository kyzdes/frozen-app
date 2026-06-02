import SwiftUI
import UIKit

// ============================================================================
// ARCTIC FROST — design tokens + frosted-glass components for «Морозилка».
// A cold, icy reinterpretation of native iOS 18 within Apple HIG.
// Direction implemented: B · Глубина (Depth) — layered glass, deeper blur,
// cyan-teal accent, floatier cards. Light = polar day, dark = polar night.
// ============================================================================

enum AF {
    // MARK: - Corner radii
    enum Radius {
        static let card: CGFloat = 22
        static let sheet: CGFloat = 30
        static let capsule: CGFloat = 16
        static let control: CGFloat = 14
        static let field: CGFloat = 13
        static let button: CGFloat = 12
        static let pill: CGFloat = 999
    }

    // MARK: - Spacing
    enum Space {
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 12
        static let l: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }

    // MARK: - Typography (SF system stack, strong hierarchy)
    enum Typography {
        static let largeTitle: Font = .system(size: 34, weight: .bold)
        static let title2: Font = .system(size: 22, weight: .bold)
        static let title3: Font = .system(size: 20, weight: .semibold)
        static let headline: Font = .system(size: 17, weight: .semibold)
        static let body: Font = .system(size: 17, weight: .regular)
        static let callout: Font = .system(size: 16, weight: .regular)
        static let subheadline: Font = .system(size: 15, weight: .regular)
        static let footnote: Font = .system(size: 13, weight: .regular)
        static let caption: Font = .system(size: 12, weight: .regular)
        static let caption2: Font = .system(size: 11, weight: .regular)
    }

    // MARK: - Colours (light = polar day / dark = polar night).
    // 8-digit hex is AARRGGBB (leading byte = alpha) for translucent tokens.
    enum Color {
        static let accent       = SwiftUI.Color(light: "#0A9EC0", dark: "#34D2DC")
        static let accentPress  = SwiftUI.Color(light: "#0A7EA8", dark: "#2FB4D4")
        static let accentText   = SwiftUI.Color(light: "#0B7E98", dark: "#59D4EE")
        static let accentSoft   = SwiftUI.Color(light: "#2414A0D2", dark: "#293CC8E6")
        static let accentGradA  = SwiftUI.Color(light: "#11B0C8", dark: "#25C2CF")
        static let accentGradB  = SwiftUI.Color(light: "#45DCD0", dark: "#4EF0E6")
        static let onAccent     = SwiftUI.Color(light: "#FFFFFF", dark: "#04232E")

        // Polar gradient backdrop
        static let bg     = SwiftUI.Color(light: "#EAF3FA", dark: "#07151D")
        static let gradA  = SwiftUI.Color(light: "#F2F9FD", dark: "#0C2230")
        static let gradB  = SwiftUI.Color(light: "#DCEAF5", dark: "#081A25")
        static let gradC  = SwiftUI.Color(light: "#CFE6F1", dark: "#06131B")
        static let glow   = SwiftUI.Color(light: "#5728CDCD", dark: "#4D28BEC8") // cyan aurora
        static let glow2  = SwiftUI.Color(light: "#2E78A0DC", dark: "#293C6EB4") // blue aurora

        // Frost edges / fills
        static let frostEdge     = SwiftUI.Color(light: "#D9FFFFFF", dark: "#2E96D6F0")
        static let frostBorder   = SwiftUI.Color(light: "#7396C4E0", dark: "#3378C4E6")
        static let hairline      = SwiftUI.Color(light: "#3878A5C8", dark: "#2482C3E1")
        static let fillSecondary = SwiftUI.Color(light: "#2478A5C8", dark: "#2978B9DC")
        static let fillTertiary  = SwiftUI.Color(light: "#1A78A5C8", dark: "#1A78B9DC")

        // Text levels
        static let textPrimary   = SwiftUI.Color(light: "#0E2A38", dark: "#EAF5FA")
        static let textSecondary = SwiftUI.Color(light: "#4A6675", dark: "#A6C2CF")
        static let textTertiary  = SwiftUI.Color(light: "#86A0B0", dark: "#6E8C9B")
        static let textQuaternary = SwiftUI.Color(light: "#AEBFCA", dark: "#4F6C7A")

        // Freshness coding
        static let fresh        = SwiftUI.Color(light: "#0E9E8E", dark: "#43DAC4")
        static let freshBg      = SwiftUI.Color(light: "#210E9E8E", dark: "#2943DAC4")
        static let freshEdge    = SwiftUI.Color(light: "#4D0E9E8E", dark: "#5743DAC4")
        static let soon         = SwiftUI.Color(light: "#C47F08", dark: "#F5B342")
        static let soonBg       = SwiftUI.Color(light: "#26E08E00", dark: "#2EF5B342")
        static let soonEdge     = SwiftUI.Color(light: "#52E08E00", dark: "#5CF5B342")
        static let expired      = SwiftUI.Color(light: "#D83A63", dark: "#FF6F8E")
        static let expiredBg    = SwiftUI.Color(light: "#21D83A63", dark: "#2EFF6F8E")
        static let expiredEdge  = SwiftUI.Color(light: "#4DD83A63", dark: "#5CFF6F8E")
        static let danger       = SwiftUI.Color(light: "#E23B5E", dark: "#FF6F8E")

        // Cool-toned shadow
        static let shadow      = SwiftUI.Color(light: "#421C6E82", dark: "#8C000000")
        static let shadowSoft  = SwiftUI.Color(light: "#1E1C6E82", dark: "#66000000")
    }

    // Accent gradient used on primary actions, FAB, active chips
    static var accentGradient: LinearGradient {
        LinearGradient(colors: [Color.accentGradA, Color.accentGradB],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

// MARK: - Polar gradient backdrop (sits behind every screen)

struct ArcticBackdrop: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AF.Color.gradA, AF.Color.gradB, AF.Color.gradC],
                startPoint: UnitPoint(x: 0.15, y: 0),
                endPoint: UnitPoint(x: 0.85, y: 1)
            )
            RadialGradient(colors: [AF.Color.glow, .clear],
                           center: .topLeading, startRadius: 0, endRadius: 360)
            RadialGradient(colors: [AF.Color.glow2, .clear],
                           center: .bottomTrailing, startRadius: 0, endRadius: 380)
        }
        .ignoresSafeArea()
    }
}

// MARK: - Frosted "ice capsule" holding an emoji category hero

struct FrostCapsule: View {
    let emoji: String
    var tint: Color = AF.Color.accent
    var size: CGFloat = 50

    private var radius: CGFloat { size * 0.32 }

    var body: some View {
        Text(emoji)
            .font(.system(size: size * 0.52))
            .frame(width: size, height: size)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(tint.opacity(0.30), in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(AF.Color.frostEdge, lineWidth: 0.5)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(LinearGradient(colors: [.white.opacity(0.55), .clear],
                                         startPoint: .topLeading, endPoint: .center))
                    .blendMode(.plusLighter)
                    .allowsHitTesting(false)
            )
            .shadow(color: tint.opacity(0.35), radius: 7, x: 0, y: 4)
    }
}

// MARK: - Freshness badge (colour-coded pill with a dot)

enum Freshness {
    case fresh, soon, expired

    init(daysLeft: Int) {
        if daysLeft < 0 { self = .expired }
        else if daysLeft <= 30 { self = .soon }
        else { self = .fresh }
    }

    var color: Color {
        switch self {
        case .fresh: return AF.Color.fresh
        case .soon: return AF.Color.soon
        case .expired: return AF.Color.expired
        }
    }
    var background: Color {
        switch self {
        case .fresh: return AF.Color.freshBg
        case .soon: return AF.Color.soonBg
        case .expired: return AF.Color.expiredBg
        }
    }
    var edge: Color {
        switch self {
        case .fresh: return AF.Color.freshEdge
        case .soon: return AF.Color.soonBg
        case .expired: return AF.Color.expiredEdge
        }
    }
    var symbol: String {
        switch self {
        case .fresh: return "checkmark.seal.fill"
        case .soon: return "clock.fill"
        case .expired: return "exclamationmark.triangle.fill"
        }
    }
}

struct FreshnessBadge: View {
    let daysLeft: Int
    var style: Style = .short

    enum Style { case short, long }

    private var state: Freshness { Freshness(daysLeft: daysLeft) }

    private var text: String {
        let days = abs(daysLeft)
        let word = russianPlural(daysLeft, one: "день", few: "дня", many: "дней")
        switch state {
        case .fresh:
            return "Свежее"
        case .soon:
            return style == .long ? "Осталось \(days) \(word)" : "\(days) \(word)"
        case .expired:
            return style == .long ? "Просрочено \(days) \(word) назад" : "Просрочено"
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(state.color)
                .frame(width: 7, height: 7)
            Text(text)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(state.color)
        }
        .padding(.vertical, 3)
        .padding(.leading, 7)
        .padding(.trailing, 9)
        .background(state.background, in: Capsule())
        .overlay(Capsule().strokeBorder(state.edge, lineWidth: 0.5))
    }
}

// MARK: - Surface modifiers

private struct FrostBorder: ViewModifier {
    var cornerRadius: CGFloat
    func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(AF.Color.frostBorder, lineWidth: 0.5)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(colors: [AF.Color.frostEdge, .clear],
                                       startPoint: .top, endPoint: .center),
                        lineWidth: 0.8
                    )
                    .blendMode(.plusLighter)
                    .opacity(0.6)
                    .allowsHitTesting(false)
            )
    }
}

extension View {
    /// Frosted regular-material card with frost-edge border + cool floaty shadow.
    func afCard(cornerRadius: CGFloat = AF.Radius.card, floaty: Bool = true) -> some View {
        self
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .modifier(FrostBorder(cornerRadius: cornerRadius))
            .shadow(color: AF.Color.shadow, radius: floaty ? 20 : 12,
                    x: 0, y: floaty ? 12 : 8)
    }

    /// Lighter frosted surface for grouped lists / field groups (smaller shadow).
    func afGroup(cornerRadius: CGFloat = AF.Radius.card) -> some View {
        self
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .modifier(FrostBorder(cornerRadius: cornerRadius))
            .shadow(color: AF.Color.shadowSoft, radius: 14, x: 0, y: 8)
    }
}

// MARK: - Button styles

struct AFPrimaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AF.Typography.headline)
            .foregroundStyle(AF.Color.onAccent)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: 50)
            .background(AF.accentGradient, in: RoundedRectangle(cornerRadius: AF.Radius.button, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AF.Radius.button, style: .continuous)
                    .strokeBorder(.white.opacity(0.45), lineWidth: 0.5)
                    .blendMode(.plusLighter)
            )
            .shadow(color: AF.Color.accent.opacity(0.45), radius: 14, x: 0, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .brightness(configuration.isPressed ? -0.04 : 0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct AFTintedButtonStyle: ButtonStyle {
    var role: AFTintRole = .accent
    var fullWidth: Bool = true

    enum AFTintRole { case accent, danger }

    func makeBody(configuration: Configuration) -> some View {
        let color = role == .danger ? AF.Color.danger : AF.Color.accent
        let bg = role == .danger ? AF.Color.expiredBg : AF.Color.accentSoft
        return configuration.label
            .font(AF.Typography.headline)
            .foregroundStyle(color)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: 50)
            .background(bg, in: RoundedRectangle(cornerRadius: AF.Radius.button, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Frosted chip (shelf filters etc.)

struct AFChip: View {
    let title: String
    var systemImage: String? = nil
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let systemImage {
                    Image(systemName: systemImage).font(.system(size: 12, weight: .semibold))
                }
                Text(title).font(.system(size: 15, weight: .medium))
            }
            .foregroundStyle(isActive ? AF.Color.onAccent : AF.Color.textSecondary)
            .padding(.horizontal, 14)
            .frame(height: 32)
            .background {
                if isActive {
                    Capsule().fill(AF.accentGradient)
                        .shadow(color: AF.Color.accent.opacity(0.35), radius: 8, x: 0, y: 3)
                } else {
                    Capsule().fill(.ultraThinMaterial)
                        .overlay(Capsule().strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - iOS-pill quantity stepper

struct AFStepper: View {
    let value: Int
    var min: Int = 0
    var leadingLabel: String? = nil
    let onChange: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            if let leadingLabel {
                Text(leadingLabel)
                    .font(AF.Typography.caption)
                    .foregroundStyle(AF.Color.textTertiary)
                    .padding(.leading, 10)
                    .padding(.trailing, 4)
            }
            button(system: "minus", disabled: value <= min) { onChange(value - 1) }
            divider
            Text("\(value)")
                .font(.system(size: 16, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(AF.Color.textPrimary)
                .frame(minWidth: 30)
            divider
            button(system: "plus", disabled: false) { onChange(value + 1) }
        }
        .frame(height: 32)
        .background(AF.Color.fillSecondary, in: Capsule())
        .overlay(Capsule().strokeBorder(AF.Color.frostBorder, lineWidth: 0.5))
    }

    private var divider: some View {
        Rectangle().fill(AF.Color.frostBorder).frame(width: 0.5, height: 18)
    }

    private func button(system: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(disabled ? AF.Color.textQuaternary : AF.Color.accent)
                .frame(width: 36, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}

// MARK: - Section title (uppercase footnote)

struct AFSectionTitle: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 13, weight: .semibold))
            .tracking(0.6)
            .foregroundStyle(AF.Color.textTertiary)
            .padding(.leading, AF.Space.l)
    }
}

// ============================================================================
// Backwards-compatible Theme shim — re-skinned to Arctic Frost values so any
// remaining `Theme.*` reference still renders on-brand.
// ============================================================================

struct Theme {
    struct Colors {
        static let primary = AF.Color.accent
        static let background = AF.Color.bg
        static let cardBackground = AF.Color.fillTertiary
        static let textPrimary = AF.Color.textPrimary
        static let textSecondary = AF.Color.textSecondary
        static let textTertiary = AF.Color.textTertiary
        static let success = AF.Color.fresh
        static let warning = AF.Color.soon
        static let error = AF.Color.expired
        static let purple = Color(hex: "#8E7BE6")
        static let pink = AF.Color.expired
        static let yellow = AF.Color.soon
        static let cyan = AF.Color.accent
    }

    static let presetIcons = [
        "🥬", "🥕", "🥦", "🧅", "🍅", "🥒",
        "🍖", "🥩", "🍗", "🥓", "🍤", "🐟",
        "🫐", "🍓", "🍒", "🍇", "🫙", "🍋",
        "🥟", "🥠", "🍝", "🥧", "🧁", "🍰",
        "🥣", "🍜", "🥘", "🥫", "🧈", "🧊"
    ]

    // Cool-leaning Arctic Frost palette (icy / muted, no hot reds in the picker)
    static let presetColors = [
        "#0E9E8E", "#36C5D8", "#3098D4", "#5B7CE0",
        "#8E7BE6", "#E08ABF", "#E0A24E", "#7FB069"
    ]

    struct Typography {
        static let largeTitle = AF.Typography.largeTitle
        static let title = AF.Typography.title2
        static let headline = AF.Typography.headline
        static let body = AF.Typography.body
        static let callout = AF.Typography.callout
        static let subheadline = AF.Typography.subheadline
        static let footnote = AF.Typography.footnote
        static let caption = AF.Typography.caption
    }

    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

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
