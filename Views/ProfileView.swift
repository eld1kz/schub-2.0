import SwiftUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var viewModel = ProfileViewModel()
    @State private var showEdit = false
    @State private var showErrorAlert = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.profile == nil {
                    ProgressView().tint(DesignTokens.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let profile = viewModel.profile {
                    profileScroll(profile)
                } else {
                    VStack(spacing: 12) {
                        Text(viewModel.errorMessage ?? "Couldn't load profile")
                            .foregroundStyle(DesignTokens.textSecondary)
                        Button("Try Again") { Task { await viewModel.loadProfile() } }
                            .foregroundStyle(DesignTokens.accentText)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign Out") { Task { await authViewModel.signOut() } }
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.textTertiary)
                }
            }
            .sheet(isPresented: $showEdit) {
                if let profile = viewModel.profile {
                    EditProfileView(viewModel: viewModel, profile: profile)
                }
            }
            .alert("Profile Photo Error", isPresented: $showErrorAlert) {
                Button("OK", role: .cancel) {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "Couldn't save your profile photo.")
            }
            .onChange(of: viewModel.errorMessage) { _, newValue in
                showErrorAlert = newValue != nil
            }
            .task { await viewModel.loadProfile() }
        }
    }

    private func profileScroll(_ profile: UserProfile) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                topBar
                ProfileHeaderView(profile: profile, isEditable: true) { data in
                    Task { await viewModel.uploadAvatar(data: data) }
                }
                statsRow(profile)
                if !profile.skills.isEmpty { skillsSection(profile.skills) }
                if !profile.interests.isEmpty { interestsSection(profile.interests) }
                if !profile.university.isEmpty { educationSection(profile) }
            }
            .padding(.bottom, 32)
        }
    }

    private var topBar: some View {
        HStack {
            Spacer()
            Button { showEdit = true } label: {
                Text("Edit profile")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.textPrimary)
                    .padding(.horizontal, 16).padding(.vertical, 8)
                    .background(DesignTokens.cardFill)
                    .overlay(Capsule().stroke(DesignTokens.separator, lineWidth: 1))
                    .clipShape(.capsule)
            }
            .disabled(viewModel.profile == nil)
        }
        .padding(.horizontal, 18).padding(.top, 8)
    }

    private func statsRow(_ profile: UserProfile) -> some View {
        HStack(spacing: 0) {
            statCell(value: viewModel.ideasCount, label: "IDEAS")
            Rectangle().fill(DesignTokens.separator).frame(width: 1, height: 32)
            statCell(value: viewModel.connectionsCount, label: "CONNECTIONS")
            Rectangle().fill(DesignTokens.separator).frame(width: 1, height: 32)
            statCell(value: profile.skills.count, label: "SKILLS")
        }
        .padding(.vertical, 16)
        .background(DesignTokens.cardFill)
        .clipShape(.rect(cornerRadius: 16))
        .padding(.horizontal, 18)
    }

    private func statCell(value: Int, label: String) -> some View {
        VStack(spacing: 3) {
            Text("\(value)").font(.title3.bold()).foregroundStyle(DesignTokens.textPrimary)
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(DesignTokens.textTertiary)
                .tracking(0.8)
        }
        .frame(maxWidth: .infinity)
    }

    private func skillsSection(_ tags: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("SKILLS")
            pillGrid(tags, filled: true)
        }
        .padding(.horizontal, 18)
    }

    private func interestsSection(_ tags: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("INTERESTS")
            pillGrid(tags, filled: false)
        }
        .padding(.horizontal, 18)
    }

    private func educationSection(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("EDUCATION")
            VStack(alignment: .leading, spacing: 3) {
                Text(profile.university)
                    .font(.spaceGrotesk(15, weight: .bold))
                    .foregroundStyle(DesignTokens.textPrimary)
                if profile.graduationYear > 0 {
                    Text("Class of \(profile.graduationYear)")
                        .font(.caption)
                        .foregroundStyle(DesignTokens.textTertiary)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.cardFill)
            .clipShape(.rect(cornerRadius: 12))
        }
        .padding(.horizontal, 18)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(DesignTokens.textTertiary)
            .tracking(0.8)
    }

    private func pillGrid(_ tags: [String], filled: Bool) -> some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 64), alignment: .leading)],
            alignment: .leading, spacing: 8
        ) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.caption.bold())
                    .foregroundStyle(filled ? DesignTokens.accentText : DesignTokens.textSecondary)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Capsule().fill(filled ? DesignTokens.accentPill : Color.clear))
                    .overlay(Capsule().stroke(filled ? Color.clear : DesignTokens.separator, lineWidth: 1))
            }
        }
    }
}

#Preview {
    ProfileView()
        .environment(AuthViewModel())
}
