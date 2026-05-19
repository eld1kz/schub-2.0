import SwiftUI

// MARK: - Design Tokens

enum DesignTokens {
    static let background    = Color(hex: "#0e0e10")
    static let cardFill      = Color.white.opacity(0.04)
    static let cardFillStrong = Color.white.opacity(0.07)
    static let fieldFill     = Color.white.opacity(0.06)
    static let separator     = Color.white.opacity(0.06)
    static let textPrimary   = Color.white.opacity(0.95)
    static let textSecondary = Color.white.opacity(0.50)
    static let textTertiary  = Color.white.opacity(0.28)
    static let accentPill    = Color(red: 0.22, green: 0.67, blue: 1.0).opacity(0.15)
    static let accentText    = Color(red: 0.35, green: 0.76, blue: 1.0)
    static let collabGreen   = Color(hex: "#4ade80")
    static let collabGreenFill = Color(hex: "#4ade80").opacity(0.12)
    static let warning       = Color(hex: "#F59E0B")
    static let error         = Color(hex: "#F87171")
    static let shadow        = Color.black.opacity(0.24)
}

// MARK: - Legacy AppColors (auth views + cards still use these)

enum AppColors {
    static let primary            = Color.accentColor
    static let background         = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let label              = Color(.label)
    static let secondaryLabel     = Color(.secondaryLabel)
}

enum StyleConstants {
    static let cornerRadius: CGFloat = 12
    static let buttonHeight: CGFloat = 50
    static let fieldHeight: CGFloat = 50
    static let horizontalPadding: CGFloat = 24
    static let spacing: CGFloat = 16
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading = false

    func makeBody(configuration: Configuration) -> some View {
        ZStack {
            if isLoading {
                ProgressView().tint(.white)
            } else {
                configuration.label
                    .font(.headline)
                    .foregroundStyle(.white)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: StyleConstants.buttonHeight)
        .background(AppColors.primary.opacity(configuration.isPressed ? 0.8 : 1))
        .clipShape(RoundedRectangle(cornerRadius: StyleConstants.cornerRadius))
        .scaleEffect(configuration.isPressed ? 0.98 : 1)
        .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .foregroundStyle(AppColors.primary)
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 14)
            .frame(height: StyleConstants.fieldHeight)
            .background(AppColors.secondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: StyleConstants.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: StyleConstants.cornerRadius)
                    .stroke(Color(.separator), lineWidth: 0.5)
            )
    }
}

// MARK: - Color Hex

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 3: (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default: (r, g, b) = (0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: 1)
    }
}

// MARK: - Space Grotesk font helper

extension Font {
    static func spaceGrotesk(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .bold:     name = "SpaceGrotesk-Bold"
        case .semibold: name = "SpaceGrotesk-SemiBold"
        case .medium:   name = "SpaceGrotesk-Medium"
        default:        name = "SpaceGrotesk-Regular"
        }
        return .custom(name, size: size, relativeTo: .body)
    }

    static func inter(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .semibold, .bold: name = "Inter-SemiBold"
        case .medium:          name = "Inter-Medium"
        default:               name = "Inter-Regular"
        }
        return .custom(name, size: size, relativeTo: .body)
    }
}

// MARK: - Profile palette (PC)

enum PC {
    static let bg            = Color(hex: "#0c0c0d")
    static let card          = Color.white.opacity(0.035)
    static let field         = Color.white.opacity(0.05)
    static let sep           = Color.white.opacity(0.05)
    static let sep2          = Color.white.opacity(0.06)
    static let p1            = Color.white.opacity(0.94)
    static let p2            = Color.white.opacity(0.46)
    static let p3            = Color.white.opacity(0.24)
    static let green         = Color(hex: "#a8c896")
    static let greenDim      = Color(hex: "#a8c896").opacity(0.10)
    // bone accent (default)
    static let accentPillBg  = Color(red: 240/255, green: 235/255, blue: 225/255).opacity(0.10)
    static let accentPillText = Color(red: 240/255, green: 235/255, blue: 225/255).opacity(0.95)
    static let accentDot     = Color(hex: "#f0ebe1")
}

struct StatusCardView: View {
    let icon: String
    let title: String
    let subtitle: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(DesignTokens.textSecondary)
                .frame(width: 52, height: 52)
                .background(DesignTokens.fieldFill)
                .clipShape(Circle())

            VStack(spacing: 6) {
                Text(title)
                    .font(.spaceGrotesk(18, weight: .bold))
                    .foregroundStyle(DesignTokens.textPrimary)
                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(DesignTokens.accentText)
                    .clipShape(Capsule())
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(DesignTokens.cardFill)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(DesignTokens.separator, lineWidth: 1)
        )
    }
}
