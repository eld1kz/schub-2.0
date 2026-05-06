import Foundation

struct AppNotification: Codable, Identifiable {
    let id: UUID
    let recipientId: UUID
    let senderId: UUID
    let type: NotificationType
    let ideaId: UUID?
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
    }

    enum CodingKeys: String, CodingKey {
        case id, message, type
        case recipientId = "recipient_id"
        case senderId    = "sender_id"
        case ideaId      = "idea_id"
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
            let ref = notification.message.isEmpty ? "your idea" : "'\(notification.message)'"
            return "\(senderName) liked \(ref)"
        case .comment:
            let ref = notification.message.isEmpty ? "your idea" : "'\(notification.message)'"
            return "\(senderName) commented on \(ref)"
        case .connectionRequest:
            return "\(senderName) sent you a connection request"
        case .connectionAccepted:
            return "\(senderName) accepted your connection request"
        case .applied:
            return "\(senderName) wants to join as \(notification.message)"
        case .applicationAccepted:
            return "Your application was accepted: \(notification.message)"
        case .applicationDeclined:
            return "Your application was declined: \(notification.message)"
        }
    }
}
