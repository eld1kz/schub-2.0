import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class NotificationsViewModel {
    var items: [NotificationItem] = []
    var isLoading = false

    var unreadCount: Int { items.filter { !$0.notification.isRead }.count }

    private var senderProfiles: [UUID: UserProfile] = [:]
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
                .from("profiles").select()
                .in("id", values: senderIds)
                .execute().value) ?? []
            let profileMap = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            senderProfiles = profileMap

            items = notifications.map { notif in
                NotificationItem(
                    notification: notif,
                    senderName: profileMap[notif.senderId]?.name ?? "Someone",
                    senderAvatarURL: profileMap[notif.senderId]?.avatarURL ?? ""
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
        guard let connectionId = await findPendingConnection(from: item.notification.senderId) else {
            print("[NotificationsVM] acceptConnection — no pending connection found from \(item.notification.senderId)")
            return
        }
        do {
            print("[NotificationsVM] accepting connection \(connectionId)")
            try await connService.respond(to: connectionId, accept: true)
            print("[NotificationsVM] connection accepted, sending notification…")
            guard let currentUserId = try? await client.auth.session.user.id else {
                print("[NotificationsVM] ❌ could not get currentUserId")
                return
            }
            await notifService.insert(
                recipientId: item.notification.senderId,
                senderId: currentUserId,
                type: .connectionAccepted
            )
            await ensureConversation(myId: currentUserId, otherId: item.notification.senderId)
            removeItem(item)
        } catch {
            print("[NotificationsVM] ❌ acceptConnection failed: \(error)")
        }
    }

    private func ensureConversation(myId: UUID, otherId: UUID) async {
        let p1 = myId.uuidString < otherId.uuidString ? myId : otherId
        let p2 = myId.uuidString < otherId.uuidString ? otherId : myId
        struct C: Encodable {
            let participantOne: UUID; let participantTwo: UUID
            enum CodingKeys: String, CodingKey {
                case participantOne = "participant_one"; case participantTwo = "participant_two"
            }
        }
        try? await client.from("conversations")
            .insert(C(participantOne: p1, participantTwo: p2))
            .execute()
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

    // MARK: - Navigation helpers

    func profileForNavigation(from item: NotificationItem) -> UserProfile? {
        senderProfiles[item.notification.senderId]
    }

    func ideaForNavigation(_ ideaId: UUID?) async -> FeedIdea? {
        guard let ideaId else { return nil }
        guard let idea = (try? await client
            .from("ideas").select()
            .eq("id", value: ideaId.uuidString)
            .limit(1)
            .execute().value as [Idea])?.first
        else { return nil }

        let author: UserProfile?
        if let cached = senderProfiles[idea.authorId] {
            author = cached
        } else {
            author = (try? await client
                .from("profiles").select()
                .eq("id", value: idea.authorId.uuidString)
                .limit(1)
                .execute().value as [UserProfile])?.first
        }

        return FeedIdea(
            idea: idea,
            authorName: author?.name ?? "",
            authorUniversity: author?.university ?? "",
            authorAvatarURL: author?.avatarURL ?? ""
        )
    }

    func chatForNavigation(with userId: UUID) async -> (ConversationItem, UUID)? {
        guard let myId = try? await client.auth.session.user.id else { return nil }
        let otherId = userId

        let convs: [Conversation] = (try? await client
            .from("conversations").select()
            .or("and(participant_one.eq.\(myId),participant_two.eq.\(otherId)),and(participant_one.eq.\(otherId),participant_two.eq.\(myId))")
            .limit(1)
            .execute().value) ?? []

        let conv: Conversation
        if let found = convs.first {
            conv = found
        } else {
            let p1 = myId.uuidString < otherId.uuidString ? myId : otherId
            let p2 = myId.uuidString < otherId.uuidString ? otherId : myId
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

        let otherProfile = senderProfiles[otherId]
        let item = ConversationItem(
            conversation: conv,
            otherUserName: otherProfile?.name ?? "User",
            otherUserAvatar: otherProfile?.avatarURL ?? "",
            unreadCount: 0
        )
        return (item, myId)
    }
}
