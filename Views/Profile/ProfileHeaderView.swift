import SwiftUI
import PhotosUI

struct ProfileHeaderView: View {
    let profile: UserProfile
    var isEditable = false
    var onAvatarSelected: ((Data) -> Void)? = nil

    @State private var pickerItem: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 12) {
            avatarSection
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

    @ViewBuilder
    private var avatarSection: some View {
        if isEditable {
            PhotosPicker(selection: $pickerItem, matching: .images,
                         preferredItemEncoding: .compatible, photoLibrary: .shared()) {
                AvatarView(url: profile.avatarURL, name: profile.name, size: 76)
                    .overlay(alignment: .bottomTrailing) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(5)
                            .background(Color(hex: "#4F46E5"))
                            .clipShape(Circle())
                            .offset(x: 2, y: 2)
                    }
            }
            .onChange(of: pickerItem) { _, item in
                Task {
                    print("[ProfileHeader] picker item changed")
                    if let data = try? await item?.loadTransferable(type: Data.self) {
                        print("[ProfileHeader] loaded \(data.count) bytes")
                        onAvatarSelected?(data)
                    } else {
                        print("[ProfileHeader] loadTransferable returned nil")
                    }
                }
            }
        } else {
            AvatarView(url: profile.avatarURL, name: profile.name, size: 76)
        }
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
    ), isEditable: true)
    .padding()
    .background(DesignTokens.background)
    .preferredColorScheme(.dark)
}
