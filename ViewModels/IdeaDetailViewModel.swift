import Foundation
import Supabase

@MainActor
@Observable
final class IdeaDetailViewModel {
    var comments: [Comment] = []
    var isLoading = false
    var isSending = false
    var errorMessage: String?

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

        var fetched: [Comment] = (try? await client
            .from("comments").select()
            .eq("idea_id", value: idea.id.uuidString)
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
            let ideaId: UUID; let authorId: UUID; let content: String
            enum CodingKeys: String, CodingKey {
                case content
                case ideaId   = "idea_id"
                case authorId = "author_id"
            }
        }
        do {
            try await client.from("comments").insert(
                Insert(ideaId: idea.id, authorId: userId, content: text)
            ).execute()
            print("[Comment] Insert succeeded")
        } catch {
            print("[Comment] Insert FAILED: \(error)")
            errorMessage = error.localizedDescription
            comments.removeLast()
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
