import SwiftUI

struct IdeaCardView: View {
    let item: FeedIdea
    var myUserId: UUID? = nil
    var alreadyApplied: Bool = false
    var onApplyTap: () -> Void = {}
    var isLiked: Bool = false
    var onToggleLike: () -> Void = {}
    var onCommentTap: () -> Void = {}

    @State private var expanded = false

    private let indigo   = Color(hex: "#4F46E5")
    private let green    = Color(hex: "#16A34A")

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            headerRow
            contentBlock
            if !item.idea.skillsNeeded.isEmpty { skillsRow }
            if !item.idea.rolesNeeded.isEmpty { rolesRow }
            actionRow
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.cardFill)
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(DesignTokens.separator, lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 16))
    }

    // MARK: Header

    private var headerRow: some View {
        HStack(alignment: .top, spacing: 10) {
            avatarCircle
            VStack(alignment: .leading, spacing: 2) {
                Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.textPrimary)
                HStack(spacing: 4) {
                    if !item.authorUniversity.isEmpty {
                        Text(item.authorUniversity)
                            .font(.caption)
                            .foregroundStyle(DesignTokens.textSecondary)
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(DesignTokens.textTertiary)
                    }
                    Text(timeAgo)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.textTertiary)
                }
            }
            Spacer()
            stageBadge
        }
    }

    private var avatarCircle: some View {
        AvatarView(url: item.authorAvatarURL, name: item.authorName, size: 36)
    }

    private var stageBadge: some View {
        Text(item.idea.stage.displayLabel)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(item.idea.stage.badgeColor)
            .clipShape(.capsule)
    }

    // MARK: Content

    private var contentBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(item.idea.title)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            if !item.idea.description.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.idea.description)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.textSecondary)
                        .lineLimit(expanded ? nil : 3)
                        .fixedSize(horizontal: false, vertical: true)

                    if item.idea.description.count > 120 {
                        Button(expanded ? "Show less" : "Read more") {
                            withAnimation(.easeOut(duration: 0.2)) { expanded.toggle() }
                        }
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.accentText)
                    }
                }
            }
        }
    }

    // MARK: Skills

    private var skillsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(item.idea.skillsNeeded, id: \.self) { skill in
                    Text(skill)
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.accentText)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(DesignTokens.accentPill)
                        .clipShape(.capsule)
                }
            }
        }
    }

    // MARK: Roles

    private var rolesRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(item.idea.rolesNeeded, id: \.self) { role in
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 9))
                        Text(role)
                            .font(.caption.bold())
                    }
                    .foregroundStyle(green)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(DesignTokens.collabGreenFill)
                    .clipShape(.capsule)
                }
            }
        }
    }

    // MARK: Actions

    private var isOwnIdea: Bool {
        guard let uid = myUserId else { return false }
        return uid == item.idea.authorId
    }

    private var actionRow: some View {
        HStack(spacing: 0) {
            likeButton
            Spacer()
            commentButton
            Spacer()
            if !isOwnIdea {
                applyButton
                Spacer()
            }
            shareButton
        }
    }

    private var likeButton: some View {
        Button {
            onToggleLike()
        } label: {
            HStack(spacing: 5) {
                Image(systemName: isLiked ? "hand.thumbsup.fill" : "hand.thumbsup")
                    .font(.system(size: 15))
                    .foregroundStyle(isLiked ? DesignTokens.accentText : DesignTokens.textTertiary)
                    .animation(.spring(response: 0.3, dampingFraction: 0.5), value: isLiked)
                if item.idea.likesCount > 0 {
                    Text("\(item.idea.likesCount)")
                        .font(.caption.bold())
                        .foregroundStyle(isLiked ? DesignTokens.accentText : DesignTokens.textTertiary)
                        .animation(.spring(response: 0.3, dampingFraction: 0.5), value: isLiked)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var commentButton: some View {
        Button {
            print("[IdeaCard] comment button tapped")
            onCommentTap()
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "bubble.left")
                    .font(.system(size: 15))
                    .foregroundStyle(DesignTokens.textTertiary)
                if item.idea.commentsCount > 0 {
                    Text("\(item.idea.commentsCount)")
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.textTertiary)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var applyButton: some View {
        Button {
            guard !alreadyApplied else { return }
            onApplyTap()
        } label: {
            Text(alreadyApplied ? "Applied ✓" : "Apply to join")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14).padding(.vertical, 7)
                .background(alreadyApplied ? DesignTokens.textTertiary : green)
                .clipShape(.capsule)
        }
        .buttonStyle(.plain)
        .disabled(alreadyApplied)
    }

    private var shareButton: some View {
        Button {} label: {
            Image(systemName: "square.and.arrow.up")
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.textTertiary)
        }
        .buttonStyle(.plain)
    }

    // MARK: Helpers

    private var timeAgo: String {
        let seconds = -item.idea.createdAt.timeIntervalSinceNow
        if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
        if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
        return "\(Int(seconds / 86400))d ago"
    }
}

fileprivate extension Idea.Stage {
    var displayLabel: String {
        switch self {
        case .idea:     return "Idea"
        case .building: return "Building"
        case .launched: return "Launched"
        }
    }

    var badgeColor: Color {
        switch self {
        case .idea:     return Color(hex: "#7C3AED")
        case .building: return Color(hex: "#4F46E5")
        case .launched: return Color(hex: "#16A34A")
        }
    }
}

#Preview {
    IdeaCardView(item: FeedIdea(
        idea: Idea(
            id: UUID(),
            authorId: UUID(),
            title: "AI study buddy for university students",
            description: "A personalized AI tutor that adapts to each student's learning style, helping them understand complex topics through guided questions rather than direct answers.",
            skillsNeeded: ["Swift", "ML", "Backend"],
            stage: .building,
            createdAt: Date().addingTimeInterval(-7200),
            likesCount: 14
        ),
        authorName: "Eldar Ugay",
        authorUniversity: "MIT",
        authorAvatarURL: ""
    ))
    .padding()
    .background(Color(hex: "#0e0e10"))
}
