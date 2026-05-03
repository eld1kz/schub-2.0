import Foundation
import Supabase

@MainActor
@Observable
final class IdeaDetailViewModel {
    var comments: [Comment] = []
    var isLoading = false
    var isSending = false

    var myUserId: UUID?
    var myName = ""
    var myUniversity = ""

    private let idea: Idea
    private let client = SupabaseService.shared.client

    init(idea: Idea) {
        self.idea = idea
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
        }

        comments = (try? await client
            .from("comments").select()
            .eq("idea_id", value: idea.id.uuidString)
            .order("created_at", ascending: true)
            .execute().value) ?? []
    }

    func sendComment(content: String) async {
        let text = content.trimmingCharacters(in: .whitespaces)
        print("[Comment] sendComment called — text: '\(text)', myUserId: \(String(describing: myUserId))")
        guard !text.isEmpty, let userId = myUserId else {
            print("[Comment] Guard failed — text empty: \(text.isEmpty), userId nil: \(myUserId == nil)")
            return
        }

        print("[Comment] Inserting for ideaId: \(idea.id), authorId: \(userId)")

        let optimistic = Comment(
            id: UUID(), ideaId: idea.id, authorId: userId,
            authorName: myName.isEmpty ? "Anonymous" : myName,
            authorUniversity: myUniversity,
            content: text, createdAt: Date()
        )
        comments.append(optimistic)
        isSending = true
        defer { isSending = false }

        struct Insert: Encodable {
            let id: UUID; let ideaId: UUID; let authorId: UUID
            let authorName: String; let authorUniversity: String; let content: String
            enum CodingKeys: String, CodingKey {
                case id, content
                case ideaId           = "idea_id"
                case authorId         = "author_id"
                case authorName       = "author_name"
                case authorUniversity = "author_university"
            }
        }
        do {
            try await client.from("comments").insert(
                Insert(id: optimistic.id, ideaId: idea.id, authorId: userId,
                       authorName: optimistic.authorName,
                       authorUniversity: myUniversity, content: text)
            ).execute()
            print("[Comment] Insert succeeded")
        } catch {
            print("[Comment] Insert FAILED: \(error)")
        }

        await NotificationService().insert(
            recipientId: idea.authorId,
            senderId: userId,
            type: .comment,
            ideaId: idea.id,
            message: idea.title
        )
    }
}
