import Foundation

struct Message: Codable, Identifiable, Hashable {
    var id: UUID
    var conversationId: UUID
    var senderId: UUID
    var content: String
    var isRead: Bool
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case conversationId = "conversation_id"
        case senderId       = "sender_id"
        case content
        case isRead         = "is_read"
        case createdAt      = "created_at"
    }
}
