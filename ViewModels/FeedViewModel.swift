import Foundation
import Supabase

struct FeedIdea: Identifiable, Hashable {
    var id: UUID { idea.id }
    var idea: Idea
    let authorName: String
    let authorUniversity: String

    static func == (lhs: FeedIdea, rhs: FeedIdea) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

@MainActor
@Observable
final class FeedViewModel {
    var ideas: [FeedIdea] = []
    var likedIdeaIds: Set<UUID> = []
    var myUserId: UUID?
    var isLoading = false
    var errorMessage: String?

    private let client = SupabaseService.shared.client

    func loadFeed() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            myUserId = try? await client.auth.session.user.id

            let fetchedIdeas: [Idea] = try await client
                .from("ideas").select()
                .order("created_at", ascending: false)
                .execute().value

            guard !fetchedIdeas.isEmpty else { ideas = []; return }

            let authorIds = Array(Set(fetchedIdeas.map { $0.authorId.uuidString }))
            let profiles: [UserProfile] = try await client
                .from("profiles").select("id, name, university")
                .in("id", values: authorIds).execute().value
            let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

            ideas = fetchedIdeas.map { FeedIdea(
                idea: $0,
                authorName: profileMap[$0.authorId]?.name ?? "Anonymous",
                authorUniversity: profileMap[$0.authorId]?.university ?? ""
            )}

            if let userId = myUserId {
                struct LikeRecord: Decodable {
                    let ideaId: UUID
                    enum CodingKeys: String, CodingKey { case ideaId = "idea_id" }
                }
                let likes: [LikeRecord] = (try? await client
                    .from("idea_likes").select("idea_id")
                    .eq("user_id", value: userId.uuidString)
                    .execute().value) ?? []
                likedIdeaIds = Set(likes.map { $0.ideaId })
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func setCommentCount(ideaId: UUID, count: Int) {
        if let idx = ideas.firstIndex(where: { $0.id == ideaId }) {
            ideas[idx].idea.commentsCount = count
        }
    }

    func toggleLike(ideaId: UUID) async {
        guard let userId = myUserId else { return }
        let currentlyLiked = likedIdeaIds.contains(ideaId)

        // Optimistic update
        if currentlyLiked {
            likedIdeaIds.remove(ideaId)
            if let idx = ideas.firstIndex(where: { $0.id == ideaId }) {
                ideas[idx].idea.likesCount = max(0, ideas[idx].idea.likesCount - 1)
            }
            try? await client.from("idea_likes")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("idea_id", value: ideaId.uuidString)
                .execute()
        } else {
            likedIdeaIds.insert(ideaId)
            if let idx = ideas.firstIndex(where: { $0.id == ideaId }) {
                ideas[idx].idea.likesCount += 1
            }
            struct LikeInsert: Encodable {
                let userId: UUID; let ideaId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"; case ideaId = "idea_id"
                }
            }
            try? await client.from("idea_likes")
                .insert(LikeInsert(userId: userId, ideaId: ideaId))
                .execute()
            if let idx = ideas.firstIndex(where: { $0.id == ideaId }) {
                await NotificationService().insert(
                    recipientId: ideas[idx].idea.authorId,
                    senderId: userId,
                    type: .like,
                    ideaId: ideaId,
                    message: ideas[idx].idea.title
                )
            }
        }
    }
}
