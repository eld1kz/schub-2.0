import Foundation
import Supabase
import Auth

struct MatchedProfile: Identifiable {
    var id: UUID { profile.id }
    let profile: UserProfile
    let matchScore: Int
    let complementarySkills: [String]
}

enum DiscoverFilter: String, CaseIterable {
    case all = "For you"
    case developer = "Developer"
    case designer = "Designer"
    case marketing = "Marketing"
    case business = "Business"
    case data = "Data"
    case open = "Open to join"
}

@MainActor
@Observable
final class DiscoverViewModel {
    var matches: [MatchedProfile] = []
    var ideas: [FeedIdea] = []
    var myProfile: UserProfile?
    var isLoading = false

    var searchText = ""
    var selectedFilter: DiscoverFilter = .all

    private let client = SupabaseService.shared.client

    var filteredPeople: [MatchedProfile] {
        let searched = searchMatchedProfiles(matches)
        switch selectedFilter {
        case .all:
            return searched
        case .open:
            return searched.filter { $0.profile.openToCollaborate }
        default:
            return searched.filter { profileMatchesFilter($0.profile, filter: selectedFilter) }
        }
    }

    var featuredPeople: [MatchedProfile] {
        Array(filteredPeople.prefix(6))
    }

    var readyToBuildPeople: [MatchedProfile] {
        filteredPeople.filter { $0.profile.openToCollaborate }
    }

    var teammatePosts: [FeedIdea] {
        let searched = searchIdeas(ideas)
        return searched.filter { ideaMatchesCurrentFilter($0) }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            guard let userId = try? await client.auth.session.user.id else { return }

            async let myFetch: [UserProfile] = client.from("profiles").select()
                .eq("id", value: userId.uuidString).execute().value
            async let othersFetch: [UserProfile] = client.from("profiles").select()
                .neq("id", value: userId.uuidString).execute().value
            async let rawIdeasFetch: [Idea] = client.from("ideas").select()
                .order("created_at", ascending: false).limit(30).execute().value

            myProfile = (try await myFetch).first
            let others = try await othersFetch
            matches = computeMatches(others, against: myProfile)

            let rawIdeas = (try? await rawIdeasFetch) ?? []
            if !rawIdeas.isEmpty {
                let authorIds = Array(Set(rawIdeas.map { $0.authorId.uuidString }))
                let profiles: [UserProfile] = (try? await client.from("profiles")
                    .select("id, name, university, avatar_url")
                    .in("id", values: authorIds).execute().value) ?? []
                let map = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
                ideas = rawIdeas.map { FeedIdea(
                    idea: $0,
                    authorName: map[$0.authorId]?.name ?? "Anonymous",
                    authorUniversity: map[$0.authorId]?.university ?? "",
                    authorAvatarURL: map[$0.authorId]?.avatarURL ?? ""
                )}
            } else {
                ideas = []
            }
        } catch {
            matches = []
            ideas = []
        }
    }

    private func searchMatchedProfiles(_ profiles: [MatchedProfile]) -> [MatchedProfile] {
        guard !searchText.isEmpty else { return profiles }
        let q = searchText.lowercased()
        return profiles.filter {
            $0.profile.name.lowercased().contains(q) ||
            $0.profile.university.lowercased().contains(q) ||
            $0.profile.bio.lowercased().contains(q) ||
            $0.profile.skills.contains { $0.lowercased().contains(q) } ||
            $0.profile.interests.contains { $0.lowercased().contains(q) }
        }
    }

    private func searchIdeas(_ ideas: [FeedIdea]) -> [FeedIdea] {
        guard !searchText.isEmpty else { return ideas }
        let q = searchText.lowercased()
        return ideas.filter {
            $0.idea.title.lowercased().contains(q) ||
            $0.idea.description.lowercased().contains(q) ||
            $0.authorName.lowercased().contains(q) ||
            $0.idea.skillsNeeded.contains { $0.lowercased().contains(q) } ||
            $0.idea.rolesNeeded.contains { $0.lowercased().contains(q) }
        }
    }

    private func profileMatchesFilter(_ profile: UserProfile, filter: DiscoverFilter) -> Bool {
        let text = ([profile.bio] + profile.skills + profile.interests)
            .joined(separator: " ")
            .lowercased()

        switch filter {
        case .all:
            return true
        case .developer:
            return matchesAny(text, ["developer", "swift", "ios", "frontend", "backend", "fullstack", "engineer", "code"])
        case .designer:
            return matchesAny(text, ["designer", "design", "ui", "ux", "figma", "branding"])
        case .marketing:
            return matchesAny(text, ["marketing", "growth", "content", "social", "brand", "community"])
        case .business:
            return matchesAny(text, ["business", "founder", "sales", "product", "operations", "strategy"])
        case .data:
            return matchesAny(text, ["data", "ai", "ml", "analytics", "research", "python"])
        case .open:
            return profile.openToCollaborate
        }
    }

    private func ideaMatchesCurrentFilter(_ item: FeedIdea) -> Bool {
        switch selectedFilter {
        case .all, .open:
            return true
        default:
            let text = ([item.idea.title, item.idea.description] + item.idea.skillsNeeded + item.idea.rolesNeeded)
                .joined(separator: " ")
                .lowercased()
            switch selectedFilter {
            case .developer:
                return matchesAny(text, ["developer", "swift", "ios", "frontend", "backend", "fullstack", "engineer", "code"])
            case .designer:
                return matchesAny(text, ["designer", "design", "ui", "ux", "figma", "branding"])
            case .marketing:
                return matchesAny(text, ["marketing", "growth", "content", "social", "brand", "community"])
            case .business:
                return matchesAny(text, ["business", "founder", "sales", "product", "operations", "strategy"])
            case .data:
                return matchesAny(text, ["data", "ai", "ml", "analytics", "research", "python"])
            case .all, .open:
                return true
            }
        }
    }

    private func matchesAny(_ text: String, _ terms: [String]) -> Bool {
        terms.contains { text.contains($0) }
    }

    private func computeMatches(_ profiles: [UserProfile], against me: UserProfile?) -> [MatchedProfile] {
        let mySkills = Set(me?.skills ?? [])
        let myInterests = Set(me?.interests ?? [])

        return profiles.map { profile in
            let theirSkills = Set(profile.skills)
            let complementary = theirSkills.subtracting(mySkills)
            let shared = theirSkills.intersection(mySkills)
            let commonInterests = Set(profile.interests).intersection(myInterests)
            let rawScore = complementary.count * 3 + commonInterests.count * 2 + shared.count
            let maxScore = max(1, theirSkills.count * 3 + profile.interests.count * 2)
            let pct = min(100, max(15, rawScore * 100 / maxScore))
            return MatchedProfile(
                profile: profile,
                matchScore: pct,
                complementarySkills: complementary.sorted()
            )
        }
        .sorted { lhs, rhs in
            if lhs.profile.openToCollaborate != rhs.profile.openToCollaborate {
                return lhs.profile.openToCollaborate && !rhs.profile.openToCollaborate
            }
            return lhs.matchScore > rhs.matchScore
        }
    }
}
