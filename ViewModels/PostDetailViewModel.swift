import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class PostDetailViewModel {
    var comments: [Comment] = []
    var isLoading = false
    var isSending = false
    var errorMessage: String?

    var myUserId: UUID?
    var myName = ""
    var myUniversity = ""
    var reposted = false
    var liked = false

    private let post: Post
    private let client = SupabaseService.shared.client

    init(post: Post) {
        self.post = post
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        if let userId = try? await client.auth.session.user.id {
            myUserId = userId
            if let profile: UserProfile = try? await client
                .from("profiles").select()
                .eq("id", value: userId.uuidString)
                .single().execute().value {
                myName       = profile.name
                myUniversity = profile.university
            }

            struct LikeRecord: Decodable {
                let postId: UUID
                enum CodingKeys: String, CodingKey { case postId = "post_id" }
            }
            let likeRows: [LikeRecord] = (try? await client
                .from("post_likes").select("post_id")
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: post.id.uuidString)
                .execute().value) ?? []
            liked = !likeRows.isEmpty

            struct RepostRecord: Decodable {
                let postId: UUID?
                enum CodingKeys: String, CodingKey { case postId = "post_id" }
            }
            let repostRows: [RepostRecord] = (try? await client
                .from("reposts").select("post_id")
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: post.id.uuidString)
                .execute().value) ?? []
            reposted = !repostRows.isEmpty
        }

        var fetched: [Comment] = (try? await client
            .from("comments").select()
            .eq("idea_id", value: post.id.uuidString)
            .order("created_at", ascending: true)
            .execute().value) ?? []

        if !fetched.isEmpty {
            let ids = Array(Set(fetched.map { $0.authorId.uuidString }))
            let profiles: [UserProfile] = (try? await client
                .from("profiles").select("id, name, university")
                .in("id", values: ids).execute().value) ?? []
            let map = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            for i in fetched.indices {
                fetched[i].authorName       = map[fetched[i].authorId]?.name ?? ""
                fetched[i].authorUniversity = map[fetched[i].authorId]?.university ?? ""
            }
        }
        comments = fetched
    }

    func toggleLike() async {
        guard let userId = myUserId else { return }
        liked.toggle()
        if liked {
            struct LikeInsert: Encodable {
                let userId: UUID; let postId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"; case postId = "post_id"
                }
            }
            try? await client.from("post_likes")
                .insert(LikeInsert(userId: userId, postId: post.id))
                .execute()
            if post.authorId != userId {
                await NotificationService().insert(
                    recipientId: post.authorId,
                    senderId: userId,
                    type: .like,
                    targetId: post.id
                )
            }
        } else {
            try? await client.from("post_likes")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: post.id.uuidString)
                .execute()
        }
    }

    func toggleRepost() async {
        guard let userId = myUserId, post.authorId != userId else { return }
        reposted.toggle()
        if reposted {
            struct RepostInsert: Encodable {
                let userId: UUID; let postId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"; case postId = "post_id"
                }
            }
            try? await client.from("reposts")
                .insert(RepostInsert(userId: userId, postId: post.id))
                .execute()
            await NotificationService().insert(
                recipientId: post.authorId,
                senderId: userId,
                type: .repost,
                targetId: post.id
            )
        } else {
            try? await client.from("reposts")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("post_id", value: post.id.uuidString)
                .execute()
        }
    }

    func sendComment(content: String) async {
        let text = content.trimmingCharacters(in: .whitespaces)
        print("[PostComment] sendComment called — text: '\(text)', myUserId: \(String(describing: myUserId))")
        guard !text.isEmpty, let userId = myUserId else {
            print("[PostComment] Guard failed — text empty: \(text.isEmpty), userId nil: \(myUserId == nil)")
            return
        }

        let optimistic = Comment(
            id: UUID(), ideaId: post.id, authorId: userId,
            authorName: myName.isEmpty ? "Anonymous" : myName,
            authorUniversity: myUniversity,
            content: text, createdAt: Date()
        )
        comments.append(optimistic)
        isSending = true
        defer { isSending = false }

        struct Insert: Encodable {
            let ideaId: UUID; let authorId: UUID; let content: String
            enum CodingKeys: String, CodingKey {
                case content
                case ideaId   = "idea_id"
                case authorId = "author_id"
            }
        }
        do {
            try await client.from("comments").insert(
                Insert(ideaId: post.id, authorId: userId, content: text)
            ).execute()
            print("[PostComment] Insert succeeded")
            if post.authorId != userId {
                await NotificationService().insert(
                    recipientId: post.authorId,
                    senderId: userId,
                    type: .comment,
                    targetId: post.id
                )
            }
        } catch {
            print("[PostComment] Insert FAILED: \(error)")
            errorMessage = error.localizedDescription
            comments.removeLast()
        }
    }
}
