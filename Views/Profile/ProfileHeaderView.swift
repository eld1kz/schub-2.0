import SwiftUI
import PhotosUI

struct ProfileHeaderView: View {
    let profile: UserProfile
    var isEditable = false
    var onAvatarSelected: ((Data) -> Void)? = nil

    @State private var pickerItem: PhotosPickerItem?
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 16) {
                avatarSection
                VStack(alignment: .leading, spacing: 8) {
                    Text(profile.name.isEmpty ? "Your Name" : profile.name)
                        .font(.spaceGrotesk(30, weight: .bold))
                        .tracking(-0.6)
                        .foregroundStyle(DesignTokens.textPrimary)

                    if !profile.university.isEmpty || profile.graduationYear > 0 {
                        Text(subtitleText)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(DesignTokens.textSecondary)
                    } else {
                        Text("Student builder profile")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(DesignTokens.textTertiary)
                    }

                    HStack(spacing: 8) {
                        if profile.openToCollaborate {
                            collabBadge
                        }
                        builderPill("Builder profile")
                    }
                }
                Spacer(minLength: 0)
            }

            if !profile.bio.isEmpty {
                Text(profile.bio)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Add a short bio so people understand what kind of things you want to build and who should reach out.")
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 10) {
                highlightCard(
                    icon: "sparkles",
                    label: "Collab status",
                    value: profile.openToCollaborate ? "Open" : "Quiet"
                )
                highlightCard(
                    icon: "hammer",
                    label: "Skills",
                    value: "\(profile.skills.count)"
                )
                highlightCard(
                    icon: "heart.text.square",
                    label: "Interests",
                    value: "\(profile.interests.count)"
                )
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [
                    indigo.opacity(0.28),
                    Color(hex: "#161A29"),
                    DesignTokens.cardFill
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(indigo.opacity(0.18), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 28))
    }

    @ViewBuilder
    private var avatarSection: some View {
        if isEditable {
            PhotosPicker(selection: $pickerItem, matching: .images,
                         preferredItemEncoding: .compatible, photoLibrary: .shared()) {
                AvatarView(url: profile.avatarURL, name: profile.name, size: 86)
                    .overlay {
                        Circle()
                            .stroke(DesignTokens.separator, lineWidth: 1)
                    }
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

    private var subtitleText: String {
        if !profile.university.isEmpty && profile.graduationYear > 0 {
            return "\(profile.university) · \(profile.graduationYear)"
        }
        if !profile.university.isEmpty {
            return profile.university
        }
        return "Class of \(profile.graduationYear)"
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

    private func builderPill(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(DesignTokens.textSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(DesignTokens.fieldFill)
            .clipShape(Capsule())
    }

    private func highlightCard(icon: String, label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(DesignTokens.accentText)
            Text(value)
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(DesignTokens.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(DesignTokens.fieldFill)
        .clipShape(.rect(cornerRadius: 18))
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
