import SwiftUI

struct UserProfileCardView: View {
    let profile: UserProfile
    var onConnect: () -> Void = {}
    @State private var requestSent = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(profile.name.isEmpty ? "Anonymous" : profile.name)
                        .font(.headline)
                    if profile.openToCollaborate {
                        Label("Open", systemImage: "checkmark.seal.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }
                if !profile.university.isEmpty {
                    Text(profile.university)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if !profile.skills.isEmpty {
                tagRow(label: "Skills", tags: profile.skills, color: .blue)
            }

            if !profile.interests.isEmpty {
                tagRow(label: "Interests", tags: profile.interests, color: .purple)
            }

            HStack {
                Spacer()
                Button(requestSent ? "Requested" : "Connect") {
                    onConnect()
                    requestSent = true
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(requestSent)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.07), radius: 6, y: 2)
    }

    private func tagRow(label: String, tags: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(color.opacity(0.12))
                            .foregroundStyle(color)
                            .clipShape(.capsule)
                    }
                }
            }
        }
    }
}

#Preview {
    UserProfileCardView(profile: UserProfile(
        id: UUID(),
        name: "Eldar Ugay",
        university: "MIT",
        graduationYear: 2026,
        bio: "Building things",
        skills: ["Swift", "SwiftUI", "Supabase"],
        interests: ["Music", "AI", "Travel"],
        openToCollaborate: true,
        avatarURL: ""
    ))
    .padding()
}
