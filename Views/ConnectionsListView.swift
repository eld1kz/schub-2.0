import SwiftUI
import Supabase

struct ConnectionsListView: View {
    let currentUserId: UUID

    @State private var profiles: [UserProfile] = []
    @State private var isLoading = false
    @State private var chatItem: ConversationItem?
    @State private var showChat = false

    private let client = SupabaseService.shared.client
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        Group {
            if isLoading && profiles.isEmpty {
                ProgressView()
                    .tint(DesignTokens.textSecondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if profiles.isEmpty {
                VStack {
                    StatusCardView(
                        icon: "person.2",
                        title: "No connections yet",
                        subtitle: "Connect with builders to see them here."
                    )
                    .padding(16)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(profiles) { profile in
                            row(profile)
                            Divider()
                                .background(DesignTokens.separator)
                                .padding(.leading, 68)
                        }
                    }
                }
            }
        }
        .background(DesignTokens.background.ignoresSafeArea())
        .navigationTitle("Connections")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(DesignTokens.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await load() }
        .sheet(isPresented: $showChat) {
            if let item = chatItem {
                NavigationStack {
                    ChatView(conversation: item, currentUserId: currentUserId)
                }
            }
        }
    }

    private func row(_ profile: UserProfile) -> some View {
        HStack(spacing: 12) {
            AvatarView(url: profile.avatarURL, name: profile.name, size: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .lineLimit(1)
                if !profile.university.isEmpty {
                    Text(profile.university)
                        .font(.system(size: 13))
                        .foregroundStyle(DesignTokens.textSecondary)
                }
            }

            Spacer()

            Button {
                Task { await openChat(with: profile) }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 12))
                    Text("Message")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(indigo)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }

        struct ConnRow: Decodable {
            let senderId: UUID; let receiverId: UUID
            enum CodingKeys: String, CodingKey {
                case senderId = "sender_id"; case receiverId = "receiver_id"
            }
        }
        let conns: [ConnRow] = (try? await client
            .from("connections").select("sender_id,receiver_id")
            .or("sender_id.eq.\(currentUserId),receiver_id.eq.\(currentUserId)")
            .eq("status", value: "accepted")
            .execute().value) ?? []

        let otherIds = conns.map { $0.senderId == currentUserId ? $0.receiverId : $0.senderId }
        guard !otherIds.isEmpty else { profiles = []; return }

        profiles = (try? await client
            .from("profiles").select("id, name, university, avatar_url")
            .in("id", values: otherIds.map { $0.uuidString })
            .execute().value) ?? []
    }

    private func openChat(with profile: UserProfile) async {
        let otherId = profile.id
        let remote: [Conversation] = (try? await client
            .from("conversations").select()
            .or("and(participant_one.eq.\(currentUserId),participant_two.eq.\(otherId)),and(participant_one.eq.\(otherId),participant_two.eq.\(currentUserId))")
            .limit(1).execute().value) ?? []

        let conv: Conversation
        if let found = remote.first {
            conv = found
        } else {
            let p1 = currentUserId.uuidString < otherId.uuidString ? currentUserId : otherId
            let p2 = currentUserId.uuidString < otherId.uuidString ? otherId : currentUserId
            struct C: Encodable {
                let participantOne: UUID; let participantTwo: UUID
                enum CodingKeys: String, CodingKey {
                    case participantOne = "participant_one"; case participantTwo = "participant_two"
                }
            }
            guard let inserted = (try? await client
                .from("conversations").insert(C(participantOne: p1, participantTwo: p2))
                .select().execute().value as [Conversation])?.first
            else { return }
            conv = inserted
        }

        chatItem = ConversationItem(
            conversation: conv,
            otherUserName: profile.name,
            otherUserAvatar: profile.avatarURL,
            unreadCount: 0
        )
        showChat = true
    }
}

#Preview {
    NavigationStack {
        ConnectionsListView(currentUserId: UUID())
    }
    .preferredColorScheme(.dark)
}
