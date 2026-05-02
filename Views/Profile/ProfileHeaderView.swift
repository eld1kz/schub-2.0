import SwiftUI

struct ProfileHeaderView: View {
    let profile: UserProfile

    var body: some View {
        VStack(spacing: 12) {
            avatarCircle
            Text(profile.name.isEmpty ? "Your Name" : profile.name)
                .font(.spaceGrotesk(22, weight: .bold))
                .tracking(-0.3)
                .foregroundStyle(DesignTokens.textPrimary)
            if !profile.university.isEmpty {
                Text(profile.graduationYear > 0
                     ? "\(profile.university) · \(profile.graduationYear)"
                     : profile.university)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.textTertiary)
            }
            if !profile.bio.isEmpty {
                Text(profile.bio)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.textSecondary)
                    .lineSpacing(4)
                    .multilineTextAlignment(.center)
            }
            if profile.openToCollaborate {
                collabBadge
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 20)
        .frame(maxWidth: .infinity)
    }

    private var avatarCircle: some View {
        ZStack {
            if let url = URL(string: profile.avatarURL), !profile.avatarURL.isEmpty {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: { gradientCircle }
                .frame(width: 76, height: 76)
                .clipShape(Circle())
            } else {
                gradientCircle
                    .frame(width: 76, height: 76)
                    .clipShape(Circle())
            }
        }
    }

    private var gradientCircle: some View {
        Circle()
            .fill(LinearGradient(
                colors: [Color(hex: "#6c5ce7"), Color(hex: "#a855f7")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ))
            .overlay(
                Text(profile.name.first.map(String.init) ?? "?")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(.white)
            )
    }

    private var collabBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(DesignTokens.collabGreen)
                .frame(width: 6, height: 6)
            Text("Open to Collaborate")
                .font(.caption.bold())
                .foregroundStyle(DesignTokens.collabGreen)
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 12)
        .background(DesignTokens.collabGreenFill)
        .clipShape(.capsule)
    }
}

#Preview {
    ProfileHeaderView(profile: UserProfile(
        id: UUID(),
        name: "Eldar Ugay",
        university: "MIT",
        graduationYear: 2026,
        bio: "Building things at the intersection of AI and mobile.",
        skills: ["Swift"],
        interests: ["AI"],
        openToCollaborate: true,
        avatarURL: ""
    ))
    .padding()
    .background(DesignTokens.background)
}
