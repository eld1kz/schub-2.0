import SwiftUI

struct ProfileDetailView: View {
    let profile: UserProfile
    @State private var requestSent = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 16) {
                    initialsCircle
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.name.isEmpty ? "Anonymous" : profile.name)
                            .font(.title2.bold())
                        if !profile.university.isEmpty {
                            Text(profile.graduationYear > 0
                                 ? "\(profile.university) · \(profile.graduationYear)"
                                 : profile.university)
                                .foregroundStyle(.secondary)
                        }
                        if profile.openToCollaborate {
                            Label("Open to Collaborate", systemImage: "checkmark.seal.fill")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    }
                }

                Button(requestSent ? "Request Sent" : "Connect") {
                    requestSent = true
                    Task { try? await ConnectionService().sendRequest(to: profile.id) }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(requestSent)

                if !profile.bio.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Bio").font(.headline)
                        Text(profile.bio).foregroundStyle(.secondary)
                    }
                }

                tagSection(title: "Skills", tags: profile.skills)
                tagSection(title: "Interests", tags: profile.interests)
            }
            .padding()
        }
        .navigationTitle(profile.name.isEmpty ? "Profile" : profile.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var initialsCircle: some View {
        let initial = profile.name.first.map(String.init) ?? "?"
        return Circle()
            .fill(.blue.opacity(0.15))
            .frame(width: 72, height: 72)
            .overlay(Text(initial).font(.title.bold()).foregroundStyle(.blue))
    }

    @ViewBuilder
    private func tagSection(title: String, tags: [String]) -> some View {
        if !tags.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.headline)
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 70), alignment: .leading)],
                    alignment: .leading,
                    spacing: 8
                ) {
                    ForEach(tags, id: \.self) { TagChip(text: $0) }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        ProfileDetailView(profile: UserProfile(
            id: UUID(),
            name: "Eldar Ugay",
            university: "MIT",
            graduationYear: 2026,
            bio: "Building things at the intersection of AI and mobile.",
            skills: ["Swift", "SwiftUI", "Supabase"],
            interests: ["Music", "AI", "Travel"],
            openToCollaborate: true,
            avatarURL: ""
        ))
    }
}
