import Foundation
import Supabase

struct ConnectionRequest: Identifiable {
    var id: UUID { connection.id }
    let connection: Connection
    let senderName: String
    let senderUniversity: String
}

@MainActor
@Observable
final class NotificationsViewModel {
    var requests: [ConnectionRequest] = []
    var isLoading = false

    private let service = ConnectionService()
    private let client = SupabaseService.shared.client

    func loadRequests() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let connections = try await service.fetchIncoming()
            guard !connections.isEmpty else { requests = []; return }

            let senderIds = Array(Set(connections.map { $0.senderId.uuidString }))
            let profiles: [UserProfile] = try await client
                .from("profiles")
                .select("id, name, university")
                .in("id", values: senderIds)
                .execute()
                .value

            let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            requests = connections.map { conn in
                ConnectionRequest(
                    connection: conn,
                    senderName: profileMap[conn.senderId]?.name ?? "Someone",
                    senderUniversity: profileMap[conn.senderId]?.university ?? ""
                )
            }
        } catch { }
    }

    func respond(to request: ConnectionRequest, accept: Bool) async {
        do {
            try await service.respond(to: request.connection.id, accept: accept)
            requests.removeAll { $0.id == request.id }
        } catch { }
    }
}
