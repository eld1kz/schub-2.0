import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()
    @State private var applyingTo: FeedIdea? = nil
    @FocusState private var searchFocused: Bool

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    heroSection
                    searchBar
                    filterChips
                    suggestedSection
                    buildersSection
                    teammatePostsSection
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 28)
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .navigationDestination(for: UserProfile.self) { ProfileDetailView(profile: $0) }
            .navigationDestination(for: FeedIdea.self) { IdeaDetailView(item: $0) }
            .sheet(item: $applyingTo) { idea in
                ApplySheet(idea: idea.idea)
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
            .onReceive(NotificationCenter.default.publisher(for: .schubContentCreated)) { _ in
                Task { await viewModel.load() }
            }
            .onReceive(NotificationCenter.default.publisher(for: .schubProfileUpdated)) { _ in
                Task { await viewModel.load() }
            }
        }
    }

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Find your people")
                .font(.spaceGrotesk(32, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            Text("Students ready to build, join teams, and start shipping with you.")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DesignTokens.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    indigo.opacity(0.28),
                    Color(hex: "#0F172A"),
                    DesignTokens.cardFill
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(indigo.opacity(0.24), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 24))
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)

                TextField("Find builders, skills, schools...", text: $viewModel.searchText)
                    .font(.system(size: 15))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .focused($searchFocused)
                    .autocorrectionDisabled()

                if !viewModel.searchText.isEmpty {
                    Button { viewModel.searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.textSecondary)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(DesignTokens.fieldFill)
            .clipShape(.rect(cornerRadius: 14))

            if searchFocused || !viewModel.searchText.isEmpty {
                Button("Cancel") {
                    viewModel.searchText = ""
                    searchFocused = false
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(indigo)
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: searchFocused || !viewModel.searchText.isEmpty)
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DiscoverFilter.allCases, id: \.self) { filter in
                    filterChip(filter)
                }
            }
        }
    }

    private func filterChip(_ filter: DiscoverFilter) -> some View {
        let active = viewModel.selectedFilter == filter

        return Button {
            withAnimation(.easeInOut(duration: 0.18)) {
                viewModel.selectedFilter = filter
            }
        } label: {
            Text(filter.rawValue)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(active ? .white : DesignTokens.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(active ? indigo : DesignTokens.fieldFill)
                .overlay(
                    Capsule()
                        .stroke(active ? indigo : DesignTokens.separator, lineWidth: 1)
                )
                .clipShape(.capsule)
        }
        .buttonStyle(.plain)
    }

    private var suggestedSection: some View {
        sectionShell(
            title: "People for you",
            subtitle: "A few strong matches to start with"
        ) {
            if viewModel.isLoading && viewModel.featuredPeople.isEmpty {
                loadingCard
            } else if viewModel.featuredPeople.isEmpty {
                emptyCard("No matches yet", "Add more skills and interests to sharpen suggestions.")
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(viewModel.featuredPeople) { match in
                            NavigationLink(value: match.profile) {
                                SuggestedBuilderCard(match: match)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var buildersSection: some View {
        sectionShell(
            title: "Students ready to build",
            subtitle: "People actively open to joining something real"
        ) {
            if viewModel.isLoading && viewModel.readyToBuildPeople.isEmpty {
                loadingCard
            } else if viewModel.readyToBuildPeople.isEmpty {
                emptyCard("No builders found", "Try another filter or search for a specific skill.")
            } else {
                VStack(spacing: 12) {
                    ForEach(viewModel.readyToBuildPeople) { match in
                        NavigationLink(value: match.profile) {
                            BuilderRowCard(match: match)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var teammatePostsSection: some View {
        sectionShell(
            title: "Looking for teammates",
            subtitle: "Live collaboration posts from students who need people now"
        ) {
            if viewModel.isLoading && viewModel.teammatePosts.isEmpty {
                loadingCard
            } else if viewModel.teammatePosts.isEmpty {
                emptyCard("No teammate posts right now", "Check back soon or switch filters.")
            } else {
                VStack(spacing: 12) {
                    ForEach(viewModel.teammatePosts.prefix(6)) { item in
                        NavigationLink(value: item) {
                            TeammatePostCard(item: item) {
                                applyingTo = item
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func sectionShell<Content: View>(
        title: String,
        subtitle: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.spaceGrotesk(22, weight: .bold))
                    .foregroundStyle(DesignTokens.textPrimary)
                Text(subtitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(DesignTokens.textSecondary)
            }
            content()
        }
    }

    private var loadingCard: some View {
        ProgressView()
            .tint(DesignTokens.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(28)
            .background(DesignTokens.cardFill)
            .clipShape(.rect(cornerRadius: 20))
    }

    private func emptyCard(_ title: String, _ subtitle: String) -> some View {
        VStack(spacing: 10) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text(subtitle)
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(DesignTokens.cardFill)
        .clipShape(.rect(cornerRadius: 20))
    }
}

private struct SuggestedBuilderCard: View {
    let match: MatchedProfile

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                AvatarView(url: match.profile.avatarURL, name: match.profile.name, size: 52)
                Spacer()
                scoreBadge
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(match.profile.name.isEmpty ? "Unknown" : match.profile.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(DesignTokens.textPrimary)
                if !match.profile.university.isEmpty {
                    Text(match.profile.university)
                        .font(.system(size: 13))
                        .foregroundStyle(DesignTokens.textSecondary)
                }
            }

            if !match.complementarySkills.isEmpty {
                chipRow(match.complementarySkills, tint: indigo)
            } else if !match.profile.skills.isEmpty {
                chipRow(Array(match.profile.skills.prefix(3)), tint: indigo)
            }

            Text(match.profile.openToCollaborate ? "Open to build now" : "View profile")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(match.profile.openToCollaborate ? indigo : DesignTokens.textSecondary)
        }
        .padding(18)
        .frame(width: 250, alignment: .leading)
        .background(DesignTokens.cardFill)
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(indigo.opacity(0.16), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 22))
    }

    private var scoreBadge: some View {
        Text("\(match.matchScore)%")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(indigo)
            .clipShape(.capsule)
    }

    private func chipRow(_ values: [String], tint: Color) -> some View {
        HStack(spacing: 6) {
            ForEach(Array(values.prefix(3)), id: \.self) { value in
                Text(value)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(tint)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(tint.opacity(0.12))
                    .clipShape(.capsule)
            }
        }
    }
}

private struct BuilderRowCard: View {
    let match: MatchedProfile

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            AvatarView(url: match.profile.avatarURL, name: match.profile.name, size: 50)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .center) {
                    Text(match.profile.name.isEmpty ? "Unknown" : match.profile.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    if match.profile.openToCollaborate {
                        Text("Open")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(hex: "#16A34A"))
                            .clipShape(.capsule)
                    }
                    Spacer()
                    Text("\(match.matchScore)%")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(indigo)
                }

                if !match.profile.university.isEmpty {
                    Text(match.profile.university)
                        .font(.system(size: 13))
                        .foregroundStyle(DesignTokens.textSecondary)
                }

                if !match.profile.bio.isEmpty {
                    Text(match.profile.bio)
                        .font(.system(size: 13))
                        .foregroundStyle(DesignTokens.textSecondary)
                        .lineLimit(2)
                }

                HStack(spacing: 6) {
                    ForEach(Array((match.complementarySkills.isEmpty ? match.profile.skills : match.complementarySkills).prefix(3)), id: \.self) { skill in
                        Text(skill)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(indigo)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(indigo.opacity(0.12))
                            .clipShape(.capsule)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.cardFill)
        .clipShape(.rect(cornerRadius: 20))
    }
}

private struct TeammatePostCard: View {
    let item: FeedIdea
    let onJoinTap: () -> Void

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                AvatarView(url: item.authorAvatarURL, name: item.authorName, size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    if !item.authorUniversity.isEmpty {
                        Text(item.authorUniversity)
                            .font(.system(size: 12))
                            .foregroundStyle(DesignTokens.textSecondary)
                    }
                }
                Spacer()
                Text(item.idea.stage.rawValue.capitalized)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(indigo)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(indigo.opacity(0.12))
                    .clipShape(.capsule)
            }

            Text(item.idea.title)
                .font(.spaceGrotesk(20, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            if !item.idea.description.isEmpty {
                Text(item.idea.description)
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .lineLimit(3)
            }

            HStack(spacing: 6) {
                ForEach(Array((item.idea.rolesNeeded.isEmpty ? item.idea.skillsNeeded : item.idea.rolesNeeded).prefix(3)), id: \.self) { value in
                    Text(value)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(indigo)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(indigo.opacity(0.12))
                        .clipShape(.capsule)
                }
            }

            HStack {
                if item.idea.likesCount > 0 || item.idea.commentsCount > 0 {
                    Text("\(item.idea.likesCount) likes • \(item.idea.commentsCount) comments")
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.textTertiary)
                }
                Spacer()
                Button("Join", action: onJoinTap)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 9)
                    .background(indigo)
                    .clipShape(.capsule)
                    .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(DesignTokens.cardFill)
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(DesignTokens.separator, lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 22))
    }
}

#Preview {
    DiscoverView()
        .preferredColorScheme(.dark)
}
