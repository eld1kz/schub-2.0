import SwiftUI

struct PostCard: View {
    let item: FeedPost
    @State private var liked = false
    @State private var reposted = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                avatarCircle
                VStack(alignment: .leading, spacing: 6) {
                    authorHeader
                    Text(item.post.content)
                        .font(.body)
                        .foregroundStyle(DesignTokens.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    if !item.post.imageURL.isEmpty, let url = URL(string: item.post.imageURL) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Rectangle().fill(DesignTokens.fieldFill)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                    actionRow.padding(.top, 4)
                }
            }
            .padding(16)
            Rectangle().fill(DesignTokens.separator).frame(height: 1)
        }
    }

    private var avatarCircle: some View {
        Circle()
            .fill(LinearGradient(
                colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ))
            .frame(width: 38, height: 38)
            .overlay(
                Text(item.authorName.first.map(String.init) ?? "?")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            )
    }

    private var authorHeader: some View {
        HStack(spacing: 4) {
            Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            if !item.authorUniversity.isEmpty {
                Text(item.authorUniversity)
                    .font(.system(size: 13))
                    .foregroundStyle(DesignTokens.textTertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            Text(timeAgo)
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.textTertiary)
        }
    }

    private var actionRow: some View {
        HStack(spacing: 0) {
            actionBtn(icon: liked ? "heart.fill" : "heart",
                      count: item.post.likesCount + (liked ? 1 : 0),
                      color: liked ? .red : DesignTokens.textTertiary) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) { liked.toggle() }
            }
            Spacer()
            actionBtn(icon: "bubble.left", count: item.post.commentsCount,
                      color: DesignTokens.textTertiary, action: {})
            Spacer()
            actionBtn(icon: "arrow.2.squarepath",
                      count: item.post.repostsCount + (reposted ? 1 : 0),
                      color: reposted ? Color(hex: "#16A34A") : DesignTokens.textTertiary) {
                withAnimation(.easeOut(duration: 0.2)) { reposted.toggle() }
            }
            Spacer()
            actionBtn(icon: "square.and.arrow.up", count: nil,
                      color: DesignTokens.textTertiary, action: {})
        }
    }

    private func actionBtn(icon: String, count: Int?, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 14)).foregroundStyle(color)
                if let count, count > 0 {
                    Text("\(count)").font(.system(size: 12)).foregroundStyle(color)
                }
            }
        }
        .buttonStyle(.plain)
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
        authorUniversity: "MIT"
    ))
    .background(DesignTokens.background)
    .preferredColorScheme(.dark)
}
