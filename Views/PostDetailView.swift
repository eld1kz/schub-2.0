import SwiftUI

struct PostDetailView: View {
    let item: FeedPost

    @State private var vm: PostDetailViewModel
    @State private var commentText = ""
    @FocusState private var commentFocused: Bool

    private let indigo = Color(hex: "#4F46E5")
    private let green  = Color(hex: "#16A34A")
    private let muted  = Color(hex: "#6B7280")

    init(item: FeedPost) {
        self.item = item
        _vm = State(initialValue: PostDetailViewModel(post: item.post))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    postHeader
                        .padding(16)
                    Divider().padding(.horizontal, 16)
                    commentsSection
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                }
            }
            .scrollDismissesKeyboard(.interactively)

            commentInputBar
        }
        .background(DesignTokens.background.ignoresSafeArea())
        .navigationTitle("Post")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(DesignTokens.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await vm.load() }
    }

    // MARK: Post header

    private var postHeader: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 10) {
                AvatarView(url: item.authorAvatarURL, name: item.authorName, size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(DesignTokens.textPrimary)
                        if !item.authorUniversity.isEmpty {
                            Text(item.authorUniversity)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(muted)
                        }
                        Text("·").font(.caption).foregroundStyle(muted)
                        Text(timeAgo(item.post.createdAt))
                            .font(.caption).foregroundStyle(muted)
                    }
                    Text("building in public")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(indigo)
                }
                Spacer()
            }

            Text(item.post.content)
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(DesignTokens.textPrimary)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            if !item.post.imageURL.isEmpty, let url = URL(string: item.post.imageURL) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Rectangle().fill(DesignTokens.fieldFill)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 240)
                .clipShape(.rect(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(DesignTokens.separator, lineWidth: 1)
                )
            }

            Text(fullDate(item.post.createdAt))
                .font(.system(size: 13))
                .foregroundStyle(DesignTokens.textSecondary)

            HStack(spacing: 18) {
                statText("\(formatCount(item.post.commentsCount)) Replies")
                statText("\(formatCount(item.post.repostsCount + (vm.reposted ? 1 : 0))) Reposts")
                statText("\(formatCount(item.post.likesCount + (vm.liked ? 1 : 0))) Likes")
            }
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .top) {
                Rectangle().fill(DesignTokens.separator).frame(height: 1)
            }
            .overlay(alignment: .bottom) {
                Rectangle().fill(DesignTokens.separator).frame(height: 1)
            }

            detailActionRow
        }
    }

    private func statText(_ value: String) -> some View {
        Text(value)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(DesignTokens.textSecondary)
    }

    private var detailActionRow: some View {
        HStack(spacing: 24) {
            detailActionButton(
                icon: "bubble.left",
                color: DesignTokens.textTertiary,
                background: indigo.opacity(0.12),
                action: { commentFocused = true }
            )
            detailActionButton(
                icon: "arrow.2.squarepath",
                color: vm.reposted ? green : DesignTokens.textTertiary,
                background: green.opacity(0.12)
            ) {
                Task { await vm.toggleRepost() }
            }
            detailActionButton(
                icon: vm.liked ? "heart.fill" : "heart",
                color: vm.liked ? .pink : DesignTokens.textTertiary,
                background: Color.pink.opacity(0.12)
            ) {
                Task { await vm.toggleLike() }
            }
            ShareLink(item: item.post.content) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(DesignTokens.textTertiary)
                    .frame(width: 34, height: 34)
                    .background(DesignTokens.fieldFill)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            Spacer()
        }
    }

    private func detailActionButton(
        icon: String,
        color: Color,
        background: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(color)
                .frame(width: 34, height: 34)
                .background(background)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    // MARK: Comments

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(vm.comments.isEmpty ? "Comments" : "\(vm.comments.count) Comments")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            if vm.isLoading {
                ProgressView().tint(DesignTokens.textSecondary)
                    .frame(maxWidth: .infinity)
            } else if vm.comments.isEmpty {
                Text("Be the first to comment")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                ForEach(vm.comments) { comment in
                    commentRow(comment)
                }
            }
        }
        .padding(.bottom, 16)
    }

    private func commentRow(_ comment: Comment) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(LinearGradient(
                    colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                .frame(width: 32, height: 32)
                .overlay(
                    Text(comment.authorName.first.map(String.init) ?? "?")
                        .font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.authorName.isEmpty ? "Anonymous" : comment.authorName)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    if !comment.authorUniversity.isEmpty {
                        Text(comment.authorUniversity)
                            .font(.system(size: 11))
                            .foregroundStyle(DesignTokens.textTertiary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(timeAgo(comment.createdAt))
                        .font(.system(size: 11))
                        .foregroundStyle(DesignTokens.textTertiary)
                }
                Text(comment.content)
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: Comment input

    private var commentInputBar: some View {
        VStack(spacing: 0) {
            if let err = vm.errorMessage {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14).padding(.vertical, 6)
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.85))
                    .onTapGesture { vm.errorMessage = nil }
            }
            Divider()
            HStack(spacing: 10) {
                Circle()
                    .fill(LinearGradient(
                        colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(vm.myName.first.map(String.init) ?? "?")
                            .font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                    )

                TextField("Add a comment…", text: $commentText)
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .focused($commentFocused)
                    .submitLabel(.send)
                    .onSubmit { sendComment() }

                Button {
                    sendComment()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(commentText.trimmingCharacters(in: .whitespaces).isEmpty
                                         ? DesignTokens.textTertiary : indigo)
                }
                .disabled(commentText.trimmingCharacters(in: .whitespaces).isEmpty || vm.isSending)
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(DesignTokens.background)
        }
    }

    // MARK: Helpers

    private func sendComment() {
        let text = commentText
        print("[PostDetail] send tapped — text: '\(text)', myUserId: \(String(describing: vm.myUserId))")
        commentText = ""
        Task { await vm.sendComment(content: text) }
    }

    private func timeAgo(_ date: Date) -> String {
        let s = -date.timeIntervalSinceNow
        if s < 3600  { return "\(Int(s / 60))m ago" }
        if s < 86400 { return "\(Int(s / 3600))h ago" }
        return "\(Int(s / 86400))d ago"
    }

    private func fullDate(_ date: Date) -> String {
        date.formatted(.dateTime.hour().minute().month(.abbreviated).day().year())
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
}

#Preview {
    NavigationStack {
        PostDetailView(item: FeedPost(
            post: Post(
                id: UUID(), authorId: UUID(),
                content: "Just shipped a new Supabase realtime feature for Schub. The latency is absolutely insane. Builders, come check it out.",
                imageURL: "",
                createdAt: Date().addingTimeInterval(-3600),
                likesCount: 24, commentsCount: 5, repostsCount: 3
            ),
            authorName: "Eldar Ugay",
            authorUniversity: "MIT",
            authorAvatarURL: ""
        ))
    }
    .preferredColorScheme(.dark)
}
