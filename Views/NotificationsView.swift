import SwiftUI

struct NotificationsView: View {
    let viewModel: NotificationsViewModel

    @State private var path = NavigationPath()
    @State private var chatNav: ChatNavData?
    @State private var loadingId: UUID?
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    VStack {
                        ProgressView().tint(DesignTokens.textSecondary).padding(.top, 48)
                        Spacer()
                    }
                } else if viewModel.items.isEmpty {
                    emptyState
                } else {
                    notificationList
                }
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                if viewModel.unreadCount > 0 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Mark all read") {
                            Task { await viewModel.markAllRead() }
                        }
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(indigo)
                    }
                }
            }
            .navigationDestination(for: UserProfile.self) { ProfileDetailView(profile: $0) }
            .navigationDestination(for: FeedIdea.self) { IdeaDetailView(item: $0) }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
        .sheet(item: $chatNav) { data in
            NavigationStack {
                ChatView(conversation: data.item, currentUserId: data.myId)
            }
        }
    }

    // MARK: - List

    private var notificationList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(viewModel.items) { item in
                    notificationRow(item)
                    Divider()
                        .background(DesignTokens.separator)
                        .padding(.leading, 52)
                }
            }
            .animation(.easeOut(duration: 0.2), value: viewModel.items.map(\.id))
        }
    }

    // MARK: - Row

    private func notificationRow(_ item: NotificationItem) -> some View {
        let isRequest = item.notification.type == .connectionRequest
        let isBusy = loadingId == item.id

        return VStack(alignment: .leading, spacing: 0) {
            Button { handleTap(item) } label: {
                HStack(alignment: .top, spacing: 10) {
                    // Unread dot
                    Circle()
                        .fill(item.notification.isRead ? Color.clear : indigo)
                        .frame(width: 8, height: 8)
                        .padding(.top, 6)

                    // Avatar with type badge
                    avatarView(for: item)

                    // Text
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.displayMessage)
                            .font(.system(size: 14, weight: item.notification.isRead ? .regular : .semibold))
                            .foregroundStyle(DesignTokens.textPrimary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(timeAgo(item.notification.createdAt))
                            .font(.system(size: 12))
                            .foregroundStyle(DesignTokens.textTertiary)
                    }

                    Spacer(minLength: 0)

                    // Right indicator
                    if isBusy {
                        ProgressView()
                            .scaleEffect(0.75)
                            .tint(DesignTokens.textTertiary)
                    } else if !isRequest {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(DesignTokens.textTertiary)
                            .padding(.top, 2)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, isRequest ? 8 : 12)
                .background(item.notification.isRead ? Color.clear : indigo.opacity(0.06))
            }
            .buttonStyle(.plain)
            .disabled(isBusy)

            // Inline Accept / Decline for connection requests
            if isRequest {
                connectionButtons(for: item)
                    .padding(.leading, 16 + 8 + 40 + 10)
                    .padding(.trailing, 16)
                    .padding(.bottom, 12)
            }
        }
    }

    // MARK: - Avatar

    private func avatarView(for item: NotificationItem) -> some View {
        AvatarView(url: item.senderAvatarURL, name: item.senderName, size: 40)
            .overlay(alignment: .bottomTrailing) {
                Circle()
                    .fill(typeIconColor(item.notification.type))
                    .frame(width: 18, height: 18)
                    .overlay(
                        Image(systemName: typeIcon(item.notification.type))
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                    )
                    .offset(x: 2, y: 2)
            }
    }

    // MARK: - Connection Buttons

    private func connectionButtons(for item: NotificationItem) -> some View {
        HStack(spacing: 8) {
            Button("Accept") {
                Task { await viewModel.acceptConnection(from: item) }
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16).padding(.vertical, 7)
            .background(indigo)
            .clipShape(.capsule)

            Button("Decline") {
                Task { await viewModel.declineConnection(from: item) }
            }
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(DesignTokens.textSecondary)
            .padding(.horizontal, 16).padding(.vertical, 7)
            .background(DesignTokens.cardFill)
            .clipShape(.capsule)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Empty

    private var emptyState: some View {
        VStack {
            StatusCardView(
                icon: "bell.slash",
                title: "No notifications yet",
                subtitle: "Likes, comments, accepts, and connection activity will show up here."
            )
            .padding(18)
            Spacer()
        }
    }

    // MARK: - Tap Handler

    private func handleTap(_ item: NotificationItem) {
        guard loadingId == nil else { return }
        Task {
            loadingId = item.id
            await viewModel.markRead(item)

            switch item.notification.type {
            case .connectionRequest:
                if let profile = viewModel.profileForNavigation(from: item) {
                    path.append(profile)
                }

            case .connectionAccepted:
                if let (conv, myId) = await viewModel.chatForNavigation(with: item.notification.senderId) {
                    chatNav = ChatNavData(item: conv, myId: myId)
                }

            case .like, .comment, .applied, .applicationAccepted, .applicationDeclined:
                if let idea = await viewModel.ideaForNavigation(item.notification.ideaId) {
                    path.append(idea)
                }

            case .repost:
                if let idea = await viewModel.ideaForNavigation(item.notification.ideaId) {
                    path.append(idea)
                }

            case .message:
                if let (conv, myId) = await viewModel.chatForNavigation(with: item.notification.senderId) {
                    chatNav = ChatNavData(item: conv, myId: myId)
                }
            }

            loadingId = nil
        }
    }

    // MARK: - Helpers

    private func typeIcon(_ type: AppNotification.NotificationType) -> String {
        switch type {
        case .like:                 return "hand.thumbsup.fill"
        case .comment:              return "bubble.left.fill"
        case .connectionRequest:    return "person.badge.plus"
        case .connectionAccepted:   return "checkmark"
        case .applied:              return "person.fill.badge.plus"
        case .applicationAccepted:  return "checkmark.seal.fill"
        case .applicationDeclined:  return "xmark.seal.fill"
        case .repost:               return "arrow.2.squarepath"
        case .message:              return "bubble.left.fill"
        }
    }

    private func typeIconColor(_ type: AppNotification.NotificationType) -> Color {
        switch type {
        case .like:                 return indigo
        case .comment:              return Color(hex: "#3B82F6")
        case .connectionRequest:    return Color(hex: "#F59E0B")
        case .connectionAccepted:   return Color(hex: "#16A34A")
        case .applied:              return Color(hex: "#7C3AED")
        case .applicationAccepted:  return Color(hex: "#16A34A")
        case .applicationDeclined:  return Color(hex: "#EF4444")
        case .repost:               return Color(hex: "#16A34A")
        case .message:              return Color(hex: "#3B82F6")
        }
    }

    private func timeAgo(_ date: Date) -> String {
        let s = -date.timeIntervalSinceNow
        if s < 3600  { return "\(Int(s / 60))m ago" }
        if s < 86400 { return "\(Int(s / 3600))h ago" }
        return "\(Int(s / 86400))d ago"
    }
}

private struct ChatNavData: Identifiable {
    let id = UUID()
    let item: ConversationItem
    let myId: UUID
}

#Preview {
    NotificationsView(viewModel: NotificationsViewModel())
        .preferredColorScheme(.dark)
}
