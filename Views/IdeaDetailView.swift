import SwiftUI

struct IdeaDetailView: View {
    let item: FeedIdea
    var onCommentCountChange: (Int) -> Void = { _ in }

    @State private var vm: IdeaDetailViewModel
    @State private var commentText = ""
    @FocusState private var commentFocused: Bool

    private let indigo  = Color(hex: "#4F46E5")
    private let ink     = Color(hex: "#0A0A0A")
    private let muted   = Color(hex: "#6B7280")

    init(item: FeedIdea, onCommentCountChange: @escaping (Int) -> Void = { _ in }) {
        self.item = item
        self.onCommentCountChange = onCommentCountChange
        _vm = State(initialValue: IdeaDetailViewModel(idea: item.idea))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ideaHeader
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
        .navigationTitle(item.idea.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(DesignTokens.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            await vm.load()
            onCommentCountChange(vm.comments.count)
        }
        .onChange(of: vm.comments.count) { _, count in
            onCommentCountChange(count)
        }
    }

    // MARK: Idea header

    private var ideaHeader: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 10) {
                avatarCircle
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                        .font(.subheadline.bold())
                        .foregroundStyle(DesignTokens.textPrimary)
                    HStack(spacing: 4) {
                        if !item.authorUniversity.isEmpty {
                            Text(item.authorUniversity)
                                .font(.caption).foregroundStyle(muted)
                            Text("·").font(.caption).foregroundStyle(muted)
                        }
                        Text(timeAgo(item.idea.createdAt))
                            .font(.caption).foregroundStyle(muted)
                    }
                }
                Spacer()
                stageBadge
            }

            Text(item.idea.title)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            if !item.idea.description.isEmpty {
                Text(item.idea.description)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !item.idea.skillsNeeded.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(item.idea.skillsNeeded, id: \.self) { skill in
                            Text(skill)
                                .font(.caption.bold())
                                .foregroundStyle(indigo)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(indigo.opacity(0.1))
                                .clipShape(.capsule)
                        }
                    }
                }
            }
        }
    }

    private var avatarCircle: some View {
        AvatarView(url: item.authorAvatarURL, name: item.authorName, size: 36)
    }

    private var stageBadge: some View {
        Text(item.idea.stage.rawValue.capitalized)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(item.idea.stage.badgeColor)
            .clipShape(.capsule)
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
        commentText = ""
        Task { await vm.sendComment(content: text) }
    }

    private func timeAgo(_ date: Date) -> String {
        let s = -date.timeIntervalSinceNow
        if s < 3600  { return "\(Int(s / 60))m ago" }
        if s < 86400 { return "\(Int(s / 3600))h ago" }
        return "\(Int(s / 86400))d ago"
    }
}

private extension Idea.Stage {
    var badgeColor: Color {
        switch self {
        case .idea:     Color(hex: "#7C3AED")
        case .building: Color(hex: "#4F46E5")
        case .launched: Color(hex: "#16A34A")
        }
    }
}

#Preview {
    NavigationStack {
        IdeaDetailView(item: FeedIdea(
            idea: Idea(
                id: UUID(), authorId: UUID(),
                title: "AI study buddy for university students",
                description: "A personalized AI tutor that adapts to each student's learning style.",
                skillsNeeded: ["Swift", "ML", "Backend"],
                stage: .building,
                createdAt: Date().addingTimeInterval(-7200),
                likesCount: 14
            ),
            authorName: "Eldar Ugay",
            authorUniversity: "MIT",
            authorAvatarURL: ""
        ))
    }
    .preferredColorScheme(.dark)
}
