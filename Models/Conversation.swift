import Foundation

struct Conversation: Codable, Identifiable, Hashable {
    var id: UUID
    var participantOne: UUID
    var participantTwo: UUID
    var lastMessage: String
    var lastMessageAt: Date
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case participantOne  = "participant_one"
        case participantTwo  = "participant_two"
        case lastMessage     = "last_message"
        case lastMessageAt   = "last_message_at"
        case createdAt       = "created_at"
    }

    func otherParticipant(currentUserId: UUID) -> UUID {
        participantOne == currentUserId ? participantTwo : participantOne
    }
}

struct ConversationItem: Identifiable, Hashable {
    var id: UUID { conversation.id }
    let conversation: Conversation
    let otherUserName: String
    let otherUserAvatar: String
    let unreadCount: Int

    var hasUnread: Bool { unreadCount > 0 }
}
