import SwiftUI

enum AppColors {
    static let primary = Color.accentColor
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let label = Color(.label)
    static let secondaryLabel = Color(.secondaryLabel)
}

enum StyleConstants {
    static let cornerRadius: CGFloat = 12
    static let buttonHeight: CGFloat = 50
    static let fieldHeight: CGFloat = 50
    static let horizontalPadding: CGFloat = 24
    static let spacing: CGFloat = 16
}

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
