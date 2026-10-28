import SwiftUI

struct PostCard: View {
    let item: FeedPost
    var isLiked: Bool = false
    var isReposted: Bool = false
    var onCommentTap: () -> Void = {}
    var onRepost: () -> Void = {}
    var onToggleLike: () -> Void = {}

    private let green = Color(hex: "#16A34A")

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                avatarCircle
                VStack(alignment: .leading, spacing: 8) {
                    authorHeader
                    postContent
                    if !item.post.imageURL.isEmpty {
                        postImage
                    }
                    actionRow
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 12)
            Rectangle()
                .fill(DesignTokens.separator)
                .frame(height: 1)
                .padding(.leading, 66)
        }
        .background(DesignTokens.background)
    }

    private var avatarCircle: some View {
        VStack(spacing: 0) {
            AvatarView(url: item.authorAvatarURL, name: item.authorName, size: 40)
        }
    }

    private var postContent: some View {
        Text(item.post.content)
            .font(.system(size: 16, weight: .regular))
            .foregroundStyle(DesignTokens.textPrimary)
            .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder
    private var postImage: some View {
        if let url = URL(string: item.post.imageURL) {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Rectangle().fill(DesignTokens.fieldFill)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 210)
            .clipShape(.rect(cornerRadius: 16))
        }
    }

    private var authorHeader: some View {
        HStack(alignment: .center, spacing: 6) {
            Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            if !item.authorUniversity.isEmpty {
                Text(item.authorUniversity)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .lineLimit(1)
            }

            Text("·")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.textTertiary)

            Text(timeAgo)
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.textTertiary)

            Spacer(minLength: 8)

            Button {} label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DesignTokens.textTertiary)
                    .frame(width: 28, height: 28)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
    }

    private var actionRow: some View {
        HStack(spacing: 0) {
            actionBtn(
                icon: "bubble.left",
                count: item.post.commentsCount,
                color: DesignTokens.textTertiary,
                action: { onCommentTap() }
            )
            Spacer()
            actionBtn(
                icon: "arrow.2.squarepath",
                count: item.post.repostsCount,
                color: isReposted ? green : DesignTokens.textTertiary,
            ) {
                onRepost()
            }
            Spacer()
            actionBtn(
                icon: isLiked ? "heart.fill" : "heart",
                count: item.post.likesCount,
                color: isLiked ? .pink : DesignTokens.textTertiary,
            ) {
                onToggleLike()
            }
            Spacer()
            ShareLink(item: item.post.content) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 15))
                    .foregroundStyle(DesignTokens.textTertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 2)
    }

    private func actionBtn(
        icon: String,
        count: Int?,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundStyle(color)
                if let count {
                    Text(formatCount(count))
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.textPrimary)
                        .foregroundStyle(color)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func formatCount(_ count: Int) -> String {
        switch count {
        case 1_000_000...:
            return String(format: "%.1fM", Double(count) / 1_000_000).replacingOccurrences(of: ".0", with: "")
        case 1_000...:
            return String(format: "%.1fK", Double(count) / 1_000).replacingOccurrences(of: ".0", with: "")
        default:
            return "\(count)"
        }
    }

    private var timeAgo: String {
        let s = -item.post.createdAt.timeIntervalSinceNow
        if s < 3600  { return "\(max(1, Int(s / 60)))m" }
        if s < 86400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86400))d"
    }
}

#Preview {
    PostCard(item: FeedPost(
        post: Post(
            id: UUID(), authorId: UUID(),
            content: "Just shipped a new Supabase realtime feature for Schub. The latency is absolutely insane 🔥 Builders, come check it out.",
            imageURL: "",
            createdAt: Date().addingTimeInterval(-3600),
            likesCount: 24, commentsCount: 5, repostsCount: 3
        ),
        authorName: "Eldar Ugay",
        authorUniversity: "MIT",
        authorAvatarURL: ""
    ))
    .background(DesignTokens.background)
    .preferredColorScheme(.dark)
}
