import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class PostFeedViewModel {
    var posts: [FeedPost] = []
    var isLoading = false
    var isPosting = false
    var errorMessage: String?

    private let client = SupabaseService.shared.client

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let rawPosts: [Post] = try await client.from("posts").select()
                .order("created_at", ascending: false).limit(50).execute().value

            guard !rawPosts.isEmpty else { posts = []; return }

            let authorIds = Array(Set(rawPosts.map { $0.authorId.uuidString }))
            let profiles: [UserProfile] = (try? await client
                .from("profiles").select("id, name, university, avatar_url")
                .in("id", values: authorIds).execute().value) ?? []
            let map = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

            posts = rawPosts.map { post in
                FeedPost(
                    post: post,
                    authorName: map[post.authorId]?.name ?? "Anonymous",
                    authorUniversity: map[post.authorId]?.university ?? "",
                    authorAvatarURL: map[post.authorId]?.avatarURL ?? ""
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createPost(content: String) async throws {
        let trimmed = content.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        isPosting = true
        defer { isPosting = false }
        let userId = try await client.auth.session.user.id
        struct Insert: Encodable {
            let authorId: UUID; let content: String
            enum CodingKeys: String, CodingKey {
                case authorId = "author_id"; case content
            }
        }
        try await client.from("posts").insert(Insert(authorId: userId, content: trimmed)).execute()
        await load()
    }
}
