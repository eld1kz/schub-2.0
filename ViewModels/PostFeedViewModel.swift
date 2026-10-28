import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class PostFeedViewModel {
    var posts: [FeedPost] = []
    var likedPostIds: Set<UUID> = []
    var repostedPostIds: Set<UUID> = []
    var myUserId: UUID?
    var isLoading = false
    var isPosting = false
    var errorMessage: String?

    private let client = SupabaseService.shared.client

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            myUserId = try? await client.auth.session.user.id

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

            if let userId = myUserId {
                struct RepostRecord: Decodable {
                    let postId: UUID?
                    enum CodingKeys: String, CodingKey { case postId = "post_id" }
                }
                let reposts: [RepostRecord] = (try? await client
                    .from("reposts").select("post_id")
                    .eq("user_id", value: userId.uuidString)
                    .execute().value) ?? []
                repostedPostIds = Set(reposts.compactMap { $0.postId })

                struct LikeRecord: Decodable {
                    let postId: UUID
                    enum CodingKeys: String, CodingKey { case postId = "post_id" }
                }
                let likes: [LikeRecord] = (try? await client
                    .from("post_likes").select("post_id")
                    .eq("user_id", value: userId.uuidString)
                    .execute().value) ?? []
                likedPostIds = Set(likes.map { $0.postId })
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func toggleLike(post: FeedPost) async {
        guard let userId = myUserId else { return }
        let postId = post.id
        let currentlyLiked = likedPostIds.contains(postId)

        if currentlyLiked {
            likedPostIds.remove(postId)
            if let idx = posts.firstIndex(where: { $0.id == postId }) {
                posts[idx].post.likesCount = max(0, posts[idx].post.likesCount - 1)
            }
            try? await client.from("post_likes")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: postId.uuidString)
                .execute()
        } else {
            likedPostIds.insert(postId)
            if let idx = posts.firstIndex(where: { $0.id == postId }) {
                posts[idx].post.likesCount += 1
            }
            struct LikeInsert: Encodable {
                let userId: UUID; let postId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"; case postId = "post_id"
                }
            }
            try? await client.from("post_likes")
                .insert(LikeInsert(userId: userId, postId: postId))
                .execute()
            if post.post.authorId != userId {
                await NotificationService().insert(
                    recipientId: post.post.authorId,
                    senderId: userId,
                    type: .like,
                    targetId: postId
                )
            }
        }
    }

    func toggleRepost(post: FeedPost) async {
        guard let userId = myUserId else { return }
        let postId = post.id
        let currentlyReposted = repostedPostIds.contains(postId)

        if currentlyReposted {
            repostedPostIds.remove(postId)
            if let idx = posts.firstIndex(where: { $0.id == postId }) {
                posts[idx].post.repostsCount = max(0, posts[idx].post.repostsCount - 1)
            }
            try? await client.from("reposts")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: postId.uuidString)
                .execute()
        } else {
            repostedPostIds.insert(postId)
            if let idx = posts.firstIndex(where: { $0.id == postId }) {
                posts[idx].post.repostsCount += 1
            }
            struct RepostInsert: Encodable {
                let userId: UUID; let postId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"; case postId = "post_id"
                }
            }
            try? await client.from("reposts")
                .insert(RepostInsert(userId: userId, postId: postId))
                .execute()
            if post.post.authorId != userId {
                await NotificationService().insert(
                    recipientId: post.post.authorId,
                    senderId: userId,
                    type: .repost,
                    targetId: postId
                )
            }
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
