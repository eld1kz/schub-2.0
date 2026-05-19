import Foundation
import Supabase

@MainActor
@Observable
final class InboxViewModel {
    var conversations: [ConversationItem] = []
    var isLoading = false
    var currentUserId: UUID?

    var totalUnread: Int { conversations.reduce(0) { $0 + $1.unreadCount } }

    private let client = SupabaseService.shared.client

    func load() async {
        isLoading = true
        defer { isLoading = false }
        guard let userId = try? await client.auth.session.user.id else { return }
        currentUserId = userId

        let convs: [Conversation] = (try? await client
            .from("conversations").select()
            .or("participant_one.eq.\(userId),participant_two.eq.\(userId)")
            .order("last_message_at", ascending: false)
            .execute().value) ?? []

        guard !convs.isEmpty else { conversations = []; return }

        let otherIds = Array(Set(convs.map { $0.otherParticipant(currentUserId: userId).uuidString }))
        let profiles: [UserProfile] = (try? await client
            .from("profiles").select("id, name, avatar_url")
            .in("id", values: otherIds)
            .execute().value) ?? []
        let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

        struct UnreadRow: Decodable {
            let conversationId: UUID
            enum CodingKeys: String, CodingKey { case conversationId = "conversation_id" }
        }
        let unread: [UnreadRow] = (try? await client
            .from("messages").select("conversation_id")
            .neq("sender_id", value: userId.uuidString)
            .eq("is_read", value: false)
            .in("conversation_id", values: convs.map { $0.id.uuidString })
            .execute().value) ?? []
        var unreadMap: [UUID: Int] = [:]
        for row in unread { unreadMap[row.conversationId, default: 0] += 1 }

        conversations = convs.map { conv in
            let otherId = conv.otherParticipant(currentUserId: userId)
            let p = profileMap[otherId]
            return ConversationItem(
                conversation: conv,
                otherUserName: p?.name ?? "Unknown",
                otherUserAvatar: p?.avatarURL ?? "",
                unreadCount: unreadMap[conv.id] ?? 0
            )
        }
    }

    func startOrOpen(with otherUserId: UUID) async -> ConversationItem? {
        let myId: UUID
        if let id = currentUserId {
            myId = id
        } else {
            guard let fetched = try? await client.auth.session.user.id else { return nil }
            currentUserId = fetched
            myId = fetched
        }

        if let existing = conversations.first(where: {
            let c = $0.conversation
            return (c.participantOne == myId && c.participantTwo == otherUserId) ||
                   (c.participantOne == otherUserId && c.participantTwo == myId)
        }) { return existing }

        let remote: [Conversation] = (try? await client
            .from("conversations").select()
            .or("and(participant_one.eq.\(myId),participant_two.eq.\(otherUserId)),and(participant_one.eq.\(otherUserId),participant_two.eq.\(myId))")
            .limit(1).execute().value) ?? []

        let conv: Conversation
        if let found = remote.first {
            conv = found
        } else {
            let p1 = myId.uuidString < otherUserId.uuidString ? myId : otherUserId
            let p2 = myId.uuidString < otherUserId.uuidString ? otherUserId : myId
            struct C: Encodable {
                let participantOne: UUID; let participantTwo: UUID
                enum CodingKeys: String, CodingKey {
                    case participantOne = "participant_one"; case participantTwo = "participant_two"
                }
            }
            guard let inserted = (try? await client
                .from("conversations").insert(C(participantOne: p1, participantTwo: p2))
                .select().execute().value as [Conversation])?.first
            else { return nil }
            conv = inserted
        }

        let profiles: [UserProfile] = (try? await client
            .from("profiles").select("id, name, avatar_url")
            .eq("id", value: otherUserId.uuidString)
            .limit(1).execute().value) ?? []
        let p = profiles.first
        let item = ConversationItem(
            conversation: conv,
            otherUserName: p?.name ?? "Unknown",
            otherUserAvatar: p?.avatarURL ?? "",
            unreadCount: 0
        )
        if !conversations.contains(where: { $0.id == conv.id }) {
            conversations.insert(item, at: 0)
        }
        return item
    }
}
