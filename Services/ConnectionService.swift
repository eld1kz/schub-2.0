import Foundation
import Supabase

struct ConnectionService {
    private let db = SupabaseService.shared.client.from("connections")
    private let auth = SupabaseService.shared.client.auth

    func sendRequest(to receiverId: UUID) async throws {
        let senderId = try await auth.session.user.id
        try await db
            .insert(ConnectionInsert(senderId: senderId, receiverId: receiverId))
            .execute()
    }

    func fetchIncoming() async throws -> [Connection] {
        let userId = try await auth.session.user.id
        return try await db
            .select()
            .eq("receiver_id", value: userId.uuidString)
            .eq("status", value: "pending")
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    func respond(to connectionId: UUID, accept: Bool) async throws {
        try await db
            .update(StatusUpdate(status: accept ? "accepted" : "declined"))
            .eq("id", value: connectionId.uuidString)
            .execute()
    }
}

private struct ConnectionInsert: Encodable {
    let senderId: UUID
    let receiverId: UUID
}

private struct StatusUpdate: Encodable {
    let status: String
}
