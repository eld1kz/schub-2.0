import Foundation

struct AppNotification: Codable, Identifiable {
    let id: UUID
    let recipientId: UUID
    let senderId: UUID
    let type: NotificationType
    let ideaId: UUID?
    let targetId: UUID?
    let message: String
    var isRead: Bool
    let createdAt: Date

    enum NotificationType: String, Codable {
        case like                  = "like"
        case comment               = "comment"
        case connectionRequest     = "connection_request"
        case connectionAccepted    = "connection_accepted"
        case applied               = "applied"
        case applicationAccepted   = "application_accepted"
        case applicationDeclined   = "application_declined"
        case repost                = "repost"
        case message               = "message"
    }

    enum CodingKeys: String, CodingKey {
        case id, message, type
        case recipientId = "recipient_id"
        case senderId    = "sender_id"
        case ideaId      = "idea_id"
        case targetId    = "target_id"
        case isRead      = "is_read"
        case createdAt   = "created_at"
    }
}

struct NotificationItem: Identifiable {
    var id: UUID { notification.id }
    var notification: AppNotification
    let senderName: String
    let senderAvatarURL: String

    var displayMessage: String {
        switch notification.type {
        case .like:
            let title = notification.message.isEmpty ? "your idea" : "'\(notification.message)'"
            return "\(senderName) liked \(title)"
        case .comment:
            let title = notification.message.isEmpty ? "your idea" : "'\(notification.message)'"
            return "\(senderName) commented on \(title)"
        case .connectionRequest:
            return "\(senderName) wants to connect with you"
        case .connectionAccepted:
            return "\(senderName) accepted your connection"
        case .applied:
            let role = notification.message.isEmpty ? "your idea" : "as \(notification.message)"
            return "\(senderName) applied to join \(role)"
        case .applicationAccepted:
            return "Your application was accepted"
        case .applicationDeclined:
            return "Your application was declined"
        case .repost:
            return "\(senderName) reposted your post"
        case .message:
            return "\(senderName) sent you a message"
        }
    }
}
