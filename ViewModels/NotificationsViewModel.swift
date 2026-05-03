import Foundation
import Supabase

@MainActor
@Observable
final class NotificationsViewModel {
    var items: [NotificationItem] = []
    var isLoading = false

    var unreadCount: Int { items.filter { !$0.notification.isRead }.count }

    private let notifService = NotificationService()
    private let connService  = ConnectionService()
    private let client       = SupabaseService.shared.client

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let notifications = try await notifService.fetchForCurrentUser()
            guard !notifications.isEmpty else { items = []; return }

            let senderIds = Array(Set(notifications.map { $0.senderId.uuidString }))
            let profiles: [UserProfile] = (try? await client
                .from("profiles").select("id, name")
                .in("id", values: senderIds)
                .execute().value) ?? []
            let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

            items = notifications.map { notif in
                NotificationItem(
                    notification: notif,
                    senderName: profileMap[notif.senderId]?.name ?? "Someone"
                )
            }
        } catch { }
    }

    func markRead(_ item: NotificationItem) async {
        guard !item.notification.isRead else { return }
        if let idx = items.firstIndex(where: { $0.id == item.id }) {
            items[idx].notification.isRead = true
        }
        await notifService.markRead(id: item.id)
    }

    func markAllRead() async {
        guard let userId = try? await client.auth.session.user.id else { return }
        for idx in items.indices { items[idx].notification.isRead = true }
        try? await notifService.markAllRead(userId: userId)
    }

    func acceptConnection(from item: NotificationItem) async {
        guard let connectionId = await findPendingConnection(from: item.notification.senderId) else { return }
        do {
            try await connService.respond(to: connectionId, accept: true)
            if let currentUserId = try? await client.auth.session.user.id {
                await notifService.insert(
                    recipientId: item.notification.senderId,
                    senderId: currentUserId,
                    type: .connectionAccepted
                )
            }
            removeItem(item)
        } catch { }
    }

    func declineConnection(from item: NotificationItem) async {
        guard let connectionId = await findPendingConnection(from: item.notification.senderId) else { return }
        try? await connService.respond(to: connectionId, accept: false)
        removeItem(item)
    }

    private func removeItem(_ item: NotificationItem) {
        items.removeAll { $0.id == item.id }
    }

    private func findPendingConnection(from senderId: UUID) async -> UUID? {
        struct R: Decodable { let id: UUID }
        guard let userId = try? await client.auth.session.user.id else { return nil }
        let result: [R] = (try? await client
            .from("connections").select("id")
            .eq("sender_id", value: senderId.uuidString)
            .eq("receiver_id", value: userId.uuidString)
            .eq("status", value: "pending")
            .limit(1)
            .execute().value) ?? []
        return result.first?.id
    }
}
