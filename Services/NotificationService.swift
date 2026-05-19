import Foundation
import Supabase
import Auth

struct NotificationService {
    private let client = SupabaseService.shared.client
    private var db: PostgrestQueryBuilder { client.from("notifications") }

    func insert(
        recipientId: UUID,
        senderId: UUID,
        type: AppNotification.NotificationType,
        ideaId: UUID? = nil,
        message: String = ""
    ) async {
        guard recipientId != senderId else { return }
        struct Insert: Encodable {
            let recipientId: UUID; let senderId: UUID
            let type: String; let ideaId: UUID?; let message: String
            enum CodingKeys: String, CodingKey {
                case type, message
                case recipientId = "recipient_id"
                case senderId    = "sender_id"
                case ideaId      = "idea_id"
            }
        }
        do {
            try await db.insert(Insert(
                recipientId: recipientId, senderId: senderId,
                type: type.rawValue, ideaId: ideaId, message: message
            )).execute()
            print("[NotificationService] inserted \(type.rawValue) → recipient: \(recipientId)")
        } catch {
            print("[NotificationService] ❌ insert \(type.rawValue) failed: \(error)")
        }
    }

    func fetchForCurrentUser() async throws -> [AppNotification] {
        let userId = try await client.auth.session.user.id
        return try await db
            .select()
            .eq("recipient_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func markRead(id: UUID) async {
        struct Update: Encodable {
            let isRead: Bool
            enum CodingKeys: String, CodingKey { case isRead = "is_read" }
        }
        try? await db.update(Update(isRead: true))
            .eq("id", value: id.uuidString)
            .execute()
    }

    func markAllRead(userId: UUID) async throws {
        struct Update: Encodable {
            let isRead: Bool
            enum CodingKeys: String, CodingKey { case isRead = "is_read" }
        }
        try await db.update(Update(isRead: true))
            .eq("recipient_id", value: userId.uuidString)
            .eq("is_read", value: false)
            .execute()
    }
}
