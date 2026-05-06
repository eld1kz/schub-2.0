import SwiftUI

struct NotificationsView: View {
    let viewModel: NotificationsViewModel

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.items.isEmpty {
                    ProgressView().tint(DesignTokens.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var notificationList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(viewModel.items) { item in
                    notificationRow(item)
                    Divider()
                        .background(DesignTokens.separator)
                        .padding(.leading, 64)
                }
            }
            .animation(.easeOut(duration: 0.2), value: viewModel.items.map(\.id))
        }
    }

    private func notificationRow(_ item: NotificationItem) -> some View {
        Button {
            Task { await viewModel.markRead(item) }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                avatarView(for: item)

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.displayMessage)
                        .font(.system(size: 14))
                        .foregroundStyle(DesignTokens.textPrimary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(timeAgo(item.notification.createdAt))
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.textTertiary)

                    if item.notification.type == .connectionRequest {
                        connectionButtons(for: item)
                    }
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(item.notification.isRead
                ? Color.clear
                : indigo.opacity(0.06))
            .overlay(alignment: .leading) {
                if !item.notification.isRead {
                    Rectangle()
                        .fill(indigo)
                        .frame(width: 3)
                        .animation(.easeOut(duration: 0.2), value: item.notification.isRead)
                }
            }
        }
        .buttonStyle(.plain)
    }

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
        .padding(.top, 4)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bell.slash")
                .font(.system(size: 44))
                .foregroundStyle(DesignTokens.textTertiary)
            Text("No notifications yet")
                .font(.spaceGrotesk(18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text("Activity on your ideas and connections will appear here")
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func typeIcon(_ type: AppNotification.NotificationType) -> String {
        switch type {
        case .like:                    "hand.thumbsup.fill"
        case .comment:                 "bubble.left.fill"
        case .connectionRequest:       "person.badge.plus"
        case .connectionAccepted:      "checkmark"
        case .applied:                 "person.fill.badge.plus"
        case .applicationAccepted:     "checkmark.seal.fill"
        case .applicationDeclined:     "xmark.seal.fill"
        }
    }

    private func typeIconColor(_ type: AppNotification.NotificationType) -> Color {
        switch type {
        case .like:                    indigo
        case .comment:                 Color(hex: "#3B82F6")
        case .connectionRequest:       Color(hex: "#F59E0B")
        case .connectionAccepted:      Color(hex: "#16A34A")
        case .applied:                 Color(hex: "#7C3AED")
        case .applicationAccepted:     Color(hex: "#16A34A")
        case .applicationDeclined:     Color(hex: "#EF4444")
        }
    }

    private func timeAgo(_ date: Date) -> String {
        let s = -date.timeIntervalSinceNow
        if s < 3600  { return "\(Int(s / 60))m ago" }
        if s < 86400 { return "\(Int(s / 3600))h ago" }
        return "\(Int(s / 86400))d ago"
    }
}

#Preview {
    NotificationsView(viewModel: NotificationsViewModel())
        .preferredColorScheme(.dark)
}
