import SwiftUI

struct InboxView: View {
    var vm: InboxViewModel
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.conversations.isEmpty {
                    ProgressView()
                        .tint(DesignTokens.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.conversations.isEmpty {
                    emptyState
                } else {
                    conversationList
                }
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Inbox")
                        .font(.spaceGrotesk(17, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                }
            }
            .navigationDestination(for: ConversationItem.self) { item in
                if let myId = vm.currentUserId {
                    ChatView(conversation: item, currentUserId: myId)
                }
            }
            .task { await vm.load() }
            .refreshable { await vm.load() }
        }
    }

    private var emptyState: some View {
        VStack {
            StatusCardView(
                icon: "bubble.left.and.bubble.right",
                title: "No conversations yet",
                subtitle: "Connect with other builders and start collaborating. Your conversations will appear here."
            )
            .padding(16)
            Spacer()
        }
    }

    private var conversationList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(vm.conversations) { item in
                    NavigationLink(value: item) {
                        convRow(item)
                    }
                    .buttonStyle(.plain)

                    Divider()
                        .background(DesignTokens.separator)
                        .padding(.leading, 76)
                }
            }
        }
    }

    private func convRow(_ item: ConversationItem) -> some View {
        HStack(spacing: 12) {
            AvatarView(url: item.otherUserAvatar, name: item.otherUserName, size: 48)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.otherUserName)
                    .font(.system(size: 15, weight: item.hasUnread ? .bold : .semibold))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .lineLimit(1)

                Text(item.conversation.lastMessage.isEmpty ? "Say hello!" : item.conversation.lastMessage)
                    .font(.system(size: 13))
                    .foregroundStyle(item.hasUnread ? DesignTokens.textPrimary : DesignTokens.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 5) {
                Text(timeAgo(item.conversation.lastMessageAt))
                    .font(.system(size: 12))
                    .foregroundStyle(DesignTokens.textTertiary)

                if item.hasUnread {
                    Circle()
                        .fill(indigo)
                        .frame(width: 8, height: 8)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func timeAgo(_ date: Date) -> String {
        let s = -date.timeIntervalSinceNow
        if s < 3600  { return "\(max(1, Int(s / 60)))m" }
        if s < 86400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86400))d"
    }
}

#Preview {
    InboxView(vm: InboxViewModel())
        .preferredColorScheme(.dark)
}
