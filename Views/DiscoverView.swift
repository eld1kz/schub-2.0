import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.matches.isEmpty {
                    ProgressView().tint(DesignTokens.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !viewModel.hasSkills {
                    noSkillsState
                } else if viewModel.matches.isEmpty {
                    emptyState
                } else {
                    matchList
                }
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: UserProfile.self) { ProfileDetailView(profile: $0) }
            .task { await viewModel.loadProfiles() }
            .refreshable { await viewModel.loadProfiles() }
        }
    }

    private var matchList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Best matches for you")
                    .font(.spaceGrotesk(20, weight: .bold))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .padding(.horizontal, 18)
                    .padding(.top, 18)

                LazyVStack(spacing: 14) {
                    ForEach(viewModel.matches) { match in
                        NavigationLink(value: match.profile) {
                            MatchCard(match: match) {
                                Task { try? await ConnectionService().sendRequest(to: match.profile.id) }
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 18)
                    }
                }
                .padding(.bottom, 28)
            }
        }
    }

    private var noSkillsState: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.badge.plus")
                .font(.system(size: 52))
                .foregroundStyle(DesignTokens.textTertiary)
            Text("Add your skills first")
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text("We match you with people whose skills\ncomplement yours — like a co-founder search.")
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
                .multilineTextAlignment(.center)
            Text("Go to Profile → Edit Profile → Skills")
                .font(.caption)
                .foregroundStyle(DesignTokens.textTertiary)
                .padding(.top, 4)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Text("No matches yet")
                .font(.spaceGrotesk(18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text("Check back as more people join Schub.")
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Match Card

private struct MatchCard: View {
    let match: MatchedProfile
    var onConnect: () -> Void

    @State private var requestSent = false
    @State private var pressed = false

    private let indigo  = Color(hex: "#4F46E5")
    private let ink     = Color(hex: "#0A0A0A")
    private let surface = Color(hex: "#F9F9F9")

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            headerRow
            if !match.complementarySkills.isEmpty || !match.sharedSkills.isEmpty {
                skillsSection
            }
            actionRow
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(surface)
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        .scaleEffect(pressed ? 0.984 : 1)
        .animation(.easeOut(duration: 0.12), value: pressed)
        .onLongPressGesture(minimumDuration: 0, pressing: { p in pressed = p }, perform: {})
    }

    private var headerRow: some View {
        HStack(alignment: .top, spacing: 12) {
            avatarCircle
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(match.profile.name.isEmpty ? "Unknown" : match.profile.name)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(ink)
                        if !match.profile.university.isEmpty {
                            Text(match.profile.university)
                                .font(.caption)
                                .foregroundStyle(Color(hex: "#6B7280"))
                        }
                    }
                    Spacer()
                    matchBadge
                }
                if match.profile.openToCollaborate {
                    HStack(spacing: 4) {
                        Circle().fill(Color(hex: "#4ade80")).frame(width: 5, height: 5)
                        Text("Open to collaborate")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color(hex: "#4ade80"))
                    }
                }
            }
        }
    }

    private var avatarCircle: some View {
        Circle()
            .fill(LinearGradient(
                colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ))
            .frame(width: 44, height: 44)
            .overlay(
                Text(match.profile.name.first.map(String.init) ?? "?")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
            )
    }

    private var matchBadge: some View {
        Text("\(match.matchScore)% match")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(badgeColor)
            .clipShape(.capsule)
    }

    private var badgeColor: Color {
        match.matchScore >= 75 ? Color(hex: "#16A34A") :
        match.matchScore >= 50 ? indigo :
        Color(hex: "#6B7280")
    }

    private var skillsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !match.complementarySkills.isEmpty {
                skillGroup(
                    label: "Complements your skills",
                    skills: match.complementarySkills,
                    fg: indigo, bg: indigo.opacity(0.1)
                )
            }
            if !match.sharedSkills.isEmpty {
                skillGroup(
                    label: "Skills in common",
                    skills: match.sharedSkills,
                    fg: Color(hex: "#6B7280"), bg: Color(hex: "#6B7280").opacity(0.08)
                )
            }
        }
    }

    private func skillGroup(label: String, skills: [String], fg: Color, bg: Color) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(fg)
                .tracking(0.2)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(skills, id: \.self) { skill in
                        Text(skill)
                            .font(.caption.bold())
                            .foregroundStyle(fg)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(bg)
                            .clipShape(.capsule)
                    }
                }
            }
        }
    }

    private var actionRow: some View {
        HStack {
            if !match.sharedInterests.isEmpty {
                Text(match.sharedInterests.prefix(2).joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(Color(hex: "#6B7280"))
            }
            Spacer()
            Button {
                guard !requestSent else { return }
                onConnect()
                withAnimation(.easeOut(duration: 0.2)) { requestSent = true }
            } label: {
                Text(requestSent ? "Pending" : "Connect")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18).padding(.vertical, 8)
                    .background(requestSent ? Color(hex: "#6B7280") : indigo)
                    .clipShape(.capsule)
            }
            .buttonStyle(.plain)
        }
    }
}

#Preview {
    DiscoverView()
}
