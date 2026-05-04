import Foundation
import Supabase

// MARK: - Types

enum SearchFilter: String, CaseIterable {
    case all = "All"
    case people = "People"
    case ideas = "Ideas"
    case opportunities = "Opportunities"
}

enum SearchResult: Identifiable {
    case person(UserProfile)
    case idea(FeedIdea)
    case opportunity(Opportunity)

    var id: String {
        switch self {
        case .person(let p):      "p_\(p.id)"
        case .idea(let i):        "i_\(i.id)"
        case .opportunity(let o): "o_\(o.id)"
        }
    }
}

struct MatchedProfile: Identifiable {
    var id: UUID { profile.id }
    let profile: UserProfile
    let matchScore: Int
    let complementarySkills: [String]
    let sharedSkills: [String]
    let sharedInterests: [String]
}

// MARK: - ViewModel

@MainActor
@Observable
final class DiscoverViewModel {
    var matches: [MatchedProfile] = []
    var allProfiles: [UserProfile] = []
    var ideas: [FeedIdea] = []
    var opportunities: [Opportunity] = []
    var myProfile: UserProfile?
    var isLoading = false
    var errorMessage: String?

    var searchText = ""
    var selectedFilter: SearchFilter = .all

    var isSearching: Bool { !searchText.isEmpty }
    var hasSkills: Bool { !(myProfile?.skills.isEmpty ?? true) }

    var searchResults: [SearchResult] {
        guard !searchText.isEmpty else { return [] }
        let q = searchText.lowercased()
        var results: [SearchResult] = []

        if selectedFilter == .all || selectedFilter == .people {
            results += allProfiles.filter {
                $0.name.lowercased().contains(q) ||
                $0.university.lowercased().contains(q) ||
                $0.skills.contains { $0.lowercased().contains(q) }
            }.map { .person($0) }
        }

        if selectedFilter == .all || selectedFilter == .ideas {
            results += ideas.filter {
                $0.idea.title.lowercased().contains(q) ||
                $0.authorName.lowercased().contains(q) ||
                $0.idea.skillsNeeded.contains { $0.lowercased().contains(q) }
            }.map { .idea($0) }
        }

        if selectedFilter == .all || selectedFilter == .opportunities {
            results += opportunities.filter {
                $0.title.lowercased().contains(q) ||
                $0.description.lowercased().contains(q)
            }.map { .opportunity($0) }
        }

        return results
    }

    private let client = SupabaseService.shared.client

    func loadProfiles() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            guard let userId = try? await client.auth.session.user.id else { return }

            async let myFetch: [UserProfile] = client.from("profiles").select()
                .eq("id", value: userId.uuidString).execute().value
            async let othersFetch: [UserProfile] = client.from("profiles").select()
                .neq("id", value: userId.uuidString).execute().value
            async let rawIdeasFetch: [Idea] = client.from("ideas").select()
                .order("created_at", ascending: false).limit(20).execute().value
            async let opsFetch: [Opportunity] = client.from("opportunities").select()
                .order("deadline", ascending: true).limit(10).execute().value

            myProfile = (try await myFetch).first
            let others = try await othersFetch
            allProfiles = others
            matches = computeMatches(others, against: myProfile)
            opportunities = (try? await opsFetch) ?? []

            let rawIdeas = (try? await rawIdeasFetch) ?? []
            if !rawIdeas.isEmpty {
                let authorIds = Array(Set(rawIdeas.map { $0.authorId.uuidString }))
                let profiles: [UserProfile] = (try? await client.from("profiles")
                    .select("id, name, university")
                    .in("id", values: authorIds)
                    .execute().value) ?? []
                let map = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
                ideas = rawIdeas.map { FeedIdea(
                    idea: $0,
                    authorName: map[$0.authorId]?.name ?? "Anonymous",
                    authorUniversity: map[$0.authorId]?.university ?? "",
                    authorAvatarURL: map[$0.authorId]?.avatarURL ?? ""
                )}
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func computeMatches(_ profiles: [UserProfile], against me: UserProfile?) -> [MatchedProfile] {
        let mySkills = Set(me?.skills ?? [])
        let myInterests = Set(me?.interests ?? [])

        return profiles
            .map { profile in
                let theirSkills = Set(profile.skills)
                let theirInterests = Set(profile.interests)
                let complementary = theirSkills.subtracting(mySkills)
                let shared = theirSkills.intersection(mySkills)
                let commonInterests = theirInterests.intersection(myInterests)
                let rawScore = complementary.count * 3 + commonInterests.count * 2 + shared.count
                let maxScore = max(1, theirSkills.count * 3 + theirInterests.count * 2)
                let pct = min(100, max(15, rawScore * 100 / maxScore))
                return MatchedProfile(
                    profile: profile, matchScore: pct,
                    complementarySkills: complementary.sorted(),
                    sharedSkills: shared.sorted(),
                    sharedInterests: commonInterests.sorted()
                )
            }
            .sorted { $0.matchScore > $1.matchScore }
    }
}
