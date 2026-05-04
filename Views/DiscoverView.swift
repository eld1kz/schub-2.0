import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()
    @FocusState private var searchFocused: Bool

    private let bg      = Color(hex: "#F9F9F9")
    private let inputBg = Color(hex: "#F3F4F6")
    private let ink     = Color(hex: "#0A0A0A")
    private let muted   = Color(hex: "#6B7280")
    private let indigo  = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchBar
                Divider()
                if viewModel.isSearching {
                    filterPills
                    Divider()
                    searchResultsList
                } else {
                    defaultContent
                }
            }
            .background(bg.ignoresSafeArea())
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(bg, for: .navigationBar)
            .navigationDestination(for: UserProfile.self) { ProfileDetailView(profile: $0) }
            .task { await viewModel.loadProfiles() }
        }
    }

    // MARK: Search bar

    private var searchBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14))
                    .foregroundStyle(muted)
                TextField("Search people, ideas, opportunities", text: $viewModel.searchText)
                    .font(.system(size: 15))
                    .foregroundStyle(ink)
                    .focused($searchFocused)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                if !viewModel.searchText.isEmpty {
                    Button { viewModel.searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(muted)
                    }
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(inputBg)
            .clipShape(.rect(cornerRadius: 10))

            if searchFocused || viewModel.isSearching {
                Button("Cancel") {
                    viewModel.searchText = ""
                    searchFocused = false
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(indigo)
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .animation(.easeInOut(duration: 0.2), value: searchFocused || viewModel.isSearching)
    }

    // MARK: Filter pills

    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(SearchFilter.allCases, id: \.self) { filter in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { viewModel.selectedFilter = filter }
                    } label: {
                        Text(filter.rawValue)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(viewModel.selectedFilter == filter ? .white : muted)
                            .padding(.horizontal, 14).padding(.vertical, 7)
                            .background(viewModel.selectedFilter == filter ? indigo : inputBg)
                            .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
        }
        .background(bg)
    }

    // MARK: Search results

    private var searchResultsList: some View {
        Group {
            if viewModel.searchResults.isEmpty {
                Text("No results for \"\(viewModel.searchText)\"")
                    .font(.system(size: 15))
                    .foregroundStyle(muted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.searchResults) { result in
                            resultRow(result)
                            Divider().padding(.leading, 64)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }

    @ViewBuilder
    private func resultRow(_ result: SearchResult) -> some View {
        switch result {
        case .person(let p):
            NavigationLink(value: p) {
                SearchRow(icon: "person.fill", iconColor: indigo,
                          title: p.name.isEmpty ? "Unknown" : p.name,
                          subtitle: p.university,
                          initial: p.name.first.map(String.init))
            }.buttonStyle(.plain)
        case .idea(let i):
            SearchRow(icon: "lightbulb.fill", iconColor: Color(hex: "#F59E0B"),
                      title: i.idea.title,
                      subtitle: "by \(i.authorName)")
        case .opportunity(let o):
            SearchRow(icon: "briefcase.fill", iconColor: Color(hex: "#3B82F6"),
                      title: o.title,
                      subtitle: o.type.rawValue.capitalized)
        }
    }

    // MARK: Default content

    private var defaultContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if !viewModel.matches.isEmpty {
                    SectionHeader(title: "People you may know")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(viewModel.matches.prefix(8)) { match in
                                NavigationLink(value: match.profile) {
                                    CompactPersonCard(profile: match.profile)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 16).padding(.bottom, 16)
                    }
                    Divider()
                }

                if !viewModel.ideas.isEmpty {
                    SectionHeader(title: "Trending ideas")
                    ForEach(viewModel.ideas.prefix(4)) { item in
                        CompactIdeaRow(item: item)
                        Divider().padding(.leading, 60)
                    }
                    Divider()
                }

                if !viewModel.opportunities.isEmpty {
                    SectionHeader(title: "Latest opportunities")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(viewModel.opportunities.prefix(6)) { opp in
                                CompactOpportunityCard(opportunity: opp)
                            }
                        }
                        .padding(.horizontal, 16).padding(.bottom, 16)
                    }
                    Divider()
                }

                if viewModel.isLoading {
                    ProgressView().frame(maxWidth: .infinity).padding(32)
                }
            }
        }
        .refreshable { await viewModel.loadProfiles() }
    }
}

// MARK: - Section Header

private struct SectionHeader: View {
    let title: String

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Color(hex: "#0A0A0A"))
            Spacer()
            Button("See all") {}
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color(hex: "#4F46E5"))
        }
        .padding(.horizontal, 16)
        .padding(.top, 20).padding(.bottom, 12)
    }
}

// MARK: - Search Row

private struct SearchRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    var initial: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(initial != nil
                          ? LinearGradient(colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                                          startPoint: .topLeading, endPoint: .bottomTrailing)
                          : LinearGradient(colors: [iconColor.opacity(0.15), iconColor.opacity(0.15)],
                                          startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 36, height: 36)
                if let initial {
                    Text(initial)
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 14)).foregroundStyle(iconColor)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(hex: "#0A0A0A"))
                    .lineLimit(1)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: "#6B7280"))
                        .lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 11)).foregroundStyle(Color(hex: "#D1D5DB"))
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(Color(hex: "#F9F9F9"))
    }
}

// MARK: - Compact Person Card

private struct CompactPersonCard: View {
    let profile: UserProfile
    @State private var requestSent = false

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AvatarView(url: profile.avatarURL, name: profile.name, size: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.name.isEmpty ? "Unknown" : profile.name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Color(hex: "#0A0A0A"))
                    .lineLimit(1)
                if !profile.university.isEmpty {
                    let year = profile.graduationYear > 0 ? " '\(String(profile.graduationYear).suffix(2))" : ""
                    Text("\(profile.university)\(year)")
                        .font(.system(size: 11))
                        .foregroundStyle(Color(hex: "#6B7280"))
                        .lineLimit(1)
                }
            }

            if !profile.skills.isEmpty {
                HStack(spacing: 4) {
                    ForEach(Array(profile.skills.prefix(2)), id: \.self) { skill in
                        Text(skill)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(indigo)
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(indigo.opacity(0.08))
                            .clipShape(.capsule)
                    }
                }
            }

            Spacer()

            Button {
                guard !requestSent else { return }
                withAnimation(.easeOut(duration: 0.2)) { requestSent = true }
                Task { try? await ConnectionService().sendRequest(to: profile.id) }
            } label: {
                Text(requestSent ? "Pending" : "+ Connect")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(requestSent ? Color(hex: "#6B7280") : indigo)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Color.white)
                    .overlay(Capsule().stroke(requestSent ? Color(hex: "#6B7280") : indigo, lineWidth: 1))
                    .clipShape(.capsule)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .frame(width: 160, height: 180)
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.07), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Compact Idea Row

private struct CompactIdeaRow: View {
    let item: FeedIdea

    private func stageColor(_ s: Idea.Stage) -> Color {
        switch s {
        case .idea: Color(hex: "#7C3AED")
        case .building: Color(hex: "#4F46E5")
        case .launched: Color(hex: "#16A34A")
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lightbulb.fill")
                .font(.system(size: 15))
                .foregroundStyle(Color(hex: "#F59E0B"))
                .frame(width: 36, height: 36)
                .background(Color(hex: "#F59E0B").opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(item.idea.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(hex: "#0A0A0A"))
                    .lineLimit(1)
                Text(item.authorName + (item.authorUniversity.isEmpty ? "" : " · \(item.authorUniversity)"))
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: "#6B7280"))
                    .lineLimit(1)
            }
            Spacer()
            let c = stageColor(item.idea.stage)
            Text(item.idea.stage.rawValue.capitalized)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(c)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(c.opacity(0.1))
                .clipShape(.capsule)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Color(hex: "#F9F9F9"))
    }
}

// MARK: - Compact Opportunity Card

private struct CompactOpportunityCard: View {
    let opportunity: Opportunity

    private var typeColor: Color {
        switch opportunity.type {
        case .hackathon:   .orange
        case .grant:       .green
        case .internship:  .blue
        case .competition: .purple
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(opportunity.type.rawValue.capitalized)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(typeColor)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(typeColor.opacity(0.1))
                    .clipShape(.capsule)
                Spacer()
                Text(opportunity.deadline.formatted(.dateTime.month(.abbreviated).day()))
                    .font(.system(size: 11))
                    .foregroundStyle(Color(hex: "#6B7280"))
            }
            Text(opportunity.title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color(hex: "#0A0A0A"))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
            if !opportunity.description.isEmpty {
                Text(opportunity.description)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(hex: "#6B7280"))
                    .lineLimit(2)
            }
            Spacer()
            if let url = URL(string: opportunity.link), !opportunity.link.isEmpty {
                Link("View →", destination: url)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: "#4F46E5"))
            }
        }
        .padding(14)
        .frame(width: 180, height: 160)
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.07), radius: 8, x: 0, y: 2)
    }
}

#Preview {
    DiscoverView()
}
