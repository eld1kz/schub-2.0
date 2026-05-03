import Foundation
import Supabase

struct MatchedProfile: Identifiable {
    var id: UUID { profile.id }
    let profile: UserProfile
    let matchScore: Int
    let complementarySkills: [String]
    let sharedSkills: [String]
    let sharedInterests: [String]
}

@MainActor
@Observable
final class DiscoverViewModel {
    var matches: [MatchedProfile] = []
    var myProfile: UserProfile?
    var isLoading = false
    var errorMessage: String?

    var hasSkills: Bool { !(myProfile?.skills.isEmpty ?? true) }

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

            myProfile = (try await myFetch).first
            let others = try await othersFetch
            matches = computeMatches(others, against: myProfile)
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
                    profile: profile,
                    matchScore: pct,
                    complementarySkills: complementary.sorted(),
                    sharedSkills: shared.sorted(),
                    sharedInterests: commonInterests.sorted()
                )
            }
            .sorted { $0.matchScore > $1.matchScore }
    }
}
