import SwiftUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var viewModel = ProfileViewModel()
    @State private var showEdit = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let profile = viewModel.profile {
                    profileContent(profile)
                } else {
                    VStack(spacing: 12) {
                        Text(viewModel.errorMessage ?? "Couldn't load profile")
                            .foregroundStyle(.secondary)
                        Button("Try Again") {
                            Task { await viewModel.loadProfile() }
                        }
                    }
                }
            }
            .navigationTitle("Profile")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") { showEdit = true }
                        .disabled(viewModel.profile == nil)
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign Out", role: .destructive) {
                        Task { await authViewModel.signOut() }
                    }
                }
            }
            .sheet(isPresented: $showEdit) {
                if let profile = viewModel.profile {
                    EditProfileView(viewModel: viewModel, profile: profile)
                }
            }
            .task { await viewModel.loadProfile() }
        }
    }

    @ViewBuilder
    private func profileContent(_ profile: UserProfile) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 16) {
                    avatarView(profile)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.name.isEmpty ? "Your Name" : profile.name)
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
    }

    @ViewBuilder
    private func avatarView(_ profile: UserProfile) -> some View {
        if let url = URL(string: profile.avatarURL), !profile.avatarURL.isEmpty {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                initialsCircle(profile.name)
            }
            .frame(width: 72, height: 72)
            .clipShape(.circle)
        } else {
            initialsCircle(profile.name)
        }
    }

    private func initialsCircle(_ name: String) -> some View {
        let initial = name.first.map(String.init) ?? "?"
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
    ProfileView()
}
