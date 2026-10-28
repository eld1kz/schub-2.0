import Foundation
import Supabase

@MainActor
@Observable
final class ChatViewModel {
    var messages: [Message] = []
    var isLoading = false

    let conversation: ConversationItem
    let currentUserId: UUID

    private let client = SupabaseService.shared.client
    private var realtimeTask: Task<Void, Never>?

    init(conversation: ConversationItem, currentUserId: UUID) {
        self.conversation = conversation
        self.currentUserId = currentUserId
    }

    func load() async {
        print("[ChatVM] load() start — conv: \(conversation.id), other: \(conversation.otherUserName)")
        isLoading = true
        defer { isLoading = false }
        let fetched: [Message] = (try? await client
            .from("messages").select()
            .eq("conversation_id", value: conversation.id.uuidString)
            .order("created_at", ascending: true)
            .execute().value) ?? []
        print("[ChatVM] load() fetched \(fetched.count) messages")
        messages = fetched
        await markRead()
        startRealtime()
    }

    func stopRealtime() {
        realtimeTask?.cancel()
        realtimeTask = nil
    }

    func send(_ text: String) async {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        struct MsgInsert: Encodable {
            let conversationId: UUID; let senderId: UUID; let content: String
            enum CodingKeys: String, CodingKey {
                case conversationId = "conversation_id"; case senderId = "sender_id"; case content
            }
        }
        struct ConvUpdate: Encodable {
            let lastMessage: String; let lastMessageAt: Date
            enum CodingKeys: String, CodingKey {
                case lastMessage = "last_message"; case lastMessageAt = "last_message_at"
            }
        }

        guard let msg = (try? await client
            .from("messages")
            .insert(MsgInsert(conversationId: conversation.id, senderId: currentUserId, content: text))
            .select().execute().value as [Message])?.first
        else { return }

        messages.append(msg)
        try? await client.from("conversations")
            .update(ConvUpdate(lastMessage: text, lastMessageAt: Date()))
            .eq("id", value: conversation.id.uuidString)
            .execute()

        let recipientId = conversation.conversation.otherParticipant(currentUserId: currentUserId)
        await NotificationService().insert(
            recipientId: recipientId,
            senderId: currentUserId,
            type: .message
        )
    }

    private func markRead() async {
        struct R: Encodable {
            let isRead: Bool
            enum CodingKeys: String, CodingKey { case isRead = "is_read" }
        }
        try? await client.from("messages")
            .update(R(isRead: true))
            .eq("conversation_id", value: conversation.id.uuidString)
            .neq("sender_id", value: currentUserId.uuidString)
            .eq("is_read", value: false)
            .execute()
    }

    private func startRealtime() {
        realtimeTask?.cancel()
        let convId = conversation.id.uuidString
        realtimeTask = Task { [weak self] in
            guard let self else { return }
            let channel = client.channel("chat:\(convId)")
            let changes = channel.postgresChange(
                InsertAction.self,
                schema: "public",
                table: "messages",
                filter: "conversation_id=eq.\(convId)"
            )
            await channel.subscribe()
            await withTaskCancellationHandler {
                for await _ in changes {
                    guard !Task.isCancelled else { break }
                    await self.fetchNew()
                }
            } onCancel: {
                Task { await channel.unsubscribe() }
            }
        }
    }

    private func fetchNew() async {
        let all: [Message] = (try? await client
            .from("messages").select()
            .eq("conversation_id", value: conversation.id.uuidString)
            .order("created_at", ascending: true)
            .execute().value) ?? []
        let existing = Set(messages.map { $0.id })
        let new = all.filter { !existing.contains($0.id) }
        if !new.isEmpty { messages.append(contentsOf: new) }
    }
}
