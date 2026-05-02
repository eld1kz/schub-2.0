import Foundation
import Supabase

struct FeedIdea: Identifiable {
    var id: UUID { idea.id }
    let idea: Idea
    let authorName: String
    let authorUniversity: String
}

@MainActor
@Observable
final class FeedViewModel {
    var ideas: [FeedIdea] = []
    var isLoading = false
    var errorMessage: String?

    private let client = SupabaseService.shared.client

    func loadFeed() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let fetchedIdeas: [Idea] = try await client
                .from("ideas")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value

            guard !fetchedIdeas.isEmpty else {
                ideas = []
                return
            }

            let authorIds = Array(Set(fetchedIdeas.map { $0.authorId.uuidString }))
            let profiles: [UserProfile] = try await client
                .from("profiles")
                .select("id, name, university")
                .in("id", values: authorIds)
                .execute()
                .value

            let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

            ideas = fetchedIdeas.map { idea in
                FeedIdea(
                    idea: idea,
                    authorName: profileMap[idea.authorId]?.name ?? "Anonymous",
                    authorUniversity: profileMap[idea.authorId]?.university ?? ""
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
