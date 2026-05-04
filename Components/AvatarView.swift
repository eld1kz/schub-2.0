import SwiftUI

struct AvatarView: View {
    let url: String
    let name: String
    let size: CGFloat

    var body: some View {
        Group {
            if !url.isEmpty, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        gradientFill
                    }
                }
            } else {
                gradientFill
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var gradientFill: some View {
        Circle()
            .fill(LinearGradient(
                colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ))
            .overlay(
                Text(name.first.map(String.init) ?? "?")
                    .font(.system(size: size * 0.4, weight: .bold))
                    .foregroundStyle(.white)
            )
    }
}

#Preview {
    HStack(spacing: 16) {
        AvatarView(url: "", name: "Eldar Ugay", size: 40)
        AvatarView(url: "", name: "Alice", size: 32)
        AvatarView(url: "https://invalid.url/photo.jpg", name: "Bob", size: 56)
    }
    .padding()
    .background(Color.black)
}
