import SwiftUI

struct IdeaCardView: View {
    let item: FeedIdea
    var onConnect: () -> Void = {}
    var isLiked: Bool = false
    var onToggleLike: () -> Void = {}
    var onTap: () -> Void = {}
    var onCommentTap: () -> Void = {}

    @State private var requestSent = false
    @State private var expanded = false
    @State private var pressed = false

    private let indigo   = Color(hex: "#4F46E5")
    private let ink      = Color(hex: "#0A0A0A")
    private let surface  = Color(hex: "#F9F9F9")

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Group {
                headerRow
                contentBlock
                if !item.idea.skillsNeeded.isEmpty { skillsRow }
            }
            .onTapGesture { onTap() }
            actionRow
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(surface)
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        .scaleEffect(pressed ? 0.984 : 1)
        .animation(.easeOut(duration: 0.12), value: pressed)
        .onLongPressGesture(minimumDuration: 0, pressing: { p in pressed = p }, perform: {})
    }

    // MARK: Header

    private var headerRow: some View {
        HStack(alignment: .top, spacing: 10) {
            avatarCircle
            VStack(alignment: .leading, spacing: 2) {
                Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                    .font(.subheadline.bold())
                    .foregroundStyle(ink)
                HStack(spacing: 4) {
                    if !item.authorUniversity.isEmpty {
                        Text(item.authorUniversity)
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#6B7280"))
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(Color(hex: "#6B7280"))
                    }
                    Text(timeAgo)
                        .font(.caption)
                        .foregroundStyle(Color(hex: "#6B7280"))
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
                .foregroundStyle(ink)
                .fixedSize(horizontal: false, vertical: true)

            if !item.idea.description.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.idea.description)
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "#374151"))
                        .lineLimit(expanded ? nil : 3)
                        .fixedSize(horizontal: false, vertical: true)

                    if item.idea.description.count > 120 {
                        Button(expanded ? "Show less" : "Read more") {
                            withAnimation(.easeOut(duration: 0.2)) { expanded.toggle() }
                        }
                        .font(.caption.bold())
                        .foregroundStyle(indigo)
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
                        .foregroundStyle(indigo)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(indigo.opacity(0.1))
                        .clipShape(.capsule)
                }
            }
        }
    }

    // MARK: Actions

    private var actionRow: some View {
        HStack(spacing: 0) {
            likeButton
            Spacer()
            commentButton
            Spacer()
            connectButton
            Spacer()
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
                    .foregroundStyle(isLiked ? indigo : Color(hex: "#6B7280"))
                    .animation(.spring(response: 0.3, dampingFraction: 0.5), value: isLiked)
                if item.idea.likesCount > 0 {
                    Text("\(item.idea.likesCount)")
                        .font(.caption.bold())
                        .foregroundStyle(isLiked ? indigo : Color(hex: "#6B7280"))
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
                    .foregroundStyle(Color(hex: "#6B7280"))
                if item.idea.commentsCount > 0 {
                    Text("\(item.idea.commentsCount)")
                        .font(.caption.bold())
                        .foregroundStyle(Color(hex: "#6B7280"))
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var connectButton: some View {
        Button {
            guard !requestSent else { return }
            onConnect()
            withAnimation(.easeOut(duration: 0.2)) { requestSent = true }
        } label: {
            Text(requestSent ? "Pending" : "Connect")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16).padding(.vertical, 7)
                .background(requestSent ? Color(hex: "#6B7280") : indigo)
                .clipShape(.capsule)
        }
        .buttonStyle(.plain)
    }

    private var shareButton: some View {
        Button {} label: {
            Image(systemName: "square.and.arrow.up")
                .font(.system(size: 15))
                .foregroundStyle(Color(hex: "#6B7280"))
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
