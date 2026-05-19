import SwiftUI
import Supabase

private enum MyPostsTab { case posts, ideas }

struct PostView: View {
    @State private var myPosts: [FeedPost] = []
    @State private var myIdeas: [FeedIdea] = []
    @State private var myProfile: UserProfile?
    @State private var isLoading = false
    @State private var activeTab: MyPostsTab = .posts
    @State private var navigationPath = NavigationPath()

    private let indigo = Color(hex: "#4F46E5")
    private let client = SupabaseService.shared.client

    var body: some View {
        NavigationStack(path: $navigationPath) {
            VStack(spacing: 0) {
                tabBar
                Rectangle().fill(DesignTokens.separator).frame(height: 1)
                tabContent
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("My Posts")
                        .font(.spaceGrotesk(17, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                }
            }
            .navigationDestination(for: FeedPost.self) { PostDetailView(item: $0) }
            .navigationDestination(for: FeedIdea.self) { item in
                IdeaDetailView(item: item, onCommentCountChange: { _ in })
            }
            .task { await load() }
            .onReceive(NotificationCenter.default.publisher(for: .schubContentCreated)) { _ in
                Task { await load() }
            }
        }
    }

    // MARK: - Tab bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            tabButton("Posts", tab: .posts)
            tabButton("Ideas", tab: .ideas)
            Spacer()
        }
        .background(DesignTokens.background)
    }

    private func tabButton(_ label: String, tab: MyPostsTab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { activeTab = tab }
        } label: {
            VStack(spacing: 0) {
                Text(label)
                    .font(.system(size: 14, weight: activeTab == tab ? .bold : .medium))
                    .foregroundStyle(activeTab == tab ? DesignTokens.textPrimary : DesignTokens.textTertiary)
                    .padding(.vertical, 13).padding(.horizontal, 22)
                Rectangle()
                    .fill(activeTab == tab ? indigo : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Content

    @ViewBuilder
    private var tabContent: some View {
        if isLoading && myPosts.isEmpty && myIdeas.isEmpty {
            ProgressView().tint(DesignTokens.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.top, 48)
            Spacer()
        } else {
            switch activeTab {
            case .posts:
                if myPosts.isEmpty {
                    emptyState(
                        icon: "bubble.left.and.bubble.right",
                        title: "No posts yet",
                        subtitle: "Tap the + button on the Feed tab to share an update."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(myPosts) { item in
                                NavigationLink(value: item) {
                                    PostCard(item: item)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .refreshable { await load() }
                }
            case .ideas:
                if myIdeas.isEmpty {
                    emptyState(
                        icon: "lightbulb",
                        title: "No ideas yet",
                        subtitle: "Tap the + button on the Feed tab to post an idea and find teammates."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(myIdeas) { item in
                                NavigationLink(value: item) {
                                    IdeaCardView(item: item)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(16)
                    }
                    .refreshable { await load() }
                }
            }
        }
    }

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack {
            StatusCardView(icon: icon, title: title, subtitle: subtitle)
                .padding(20)
            Spacer()
        }
    }

    // MARK: - Data

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        guard let userId = try? await client.auth.session.user.id else { return }

        async let profileFetch: [UserProfile] = (try? client
            .from("profiles").select("id, name, university, avatar_url")
            .eq("id", value: userId.uuidString).limit(1).execute().value) ?? []

        async let postsFetch: [Post] = (try? client
            .from("posts").select()
            .eq("author_id", value: userId.uuidString)
            .order("created_at", ascending: false).execute().value) ?? []

        async let ideasFetch: [Idea] = (try? client
            .from("ideas").select()
            .eq("author_id", value: userId.uuidString)
            .order("created_at", ascending: false).execute().value) ?? []

        let (profiles, posts, ideas) = await (profileFetch, postsFetch, ideasFetch)
        let profile = profiles.first
        myProfile = profile

        let name = profile?.name ?? "Me"
        let university = profile?.university ?? ""
        let avatarURL = profile?.avatarURL ?? ""

        myPosts = posts.map { FeedPost(post: $0, authorName: name, authorUniversity: university, authorAvatarURL: avatarURL) }
        myIdeas = ideas.map { FeedIdea(idea: $0, authorName: name, authorUniversity: university, authorAvatarURL: avatarURL) }
    }
}

#Preview {
    PostView()
        .preferredColorScheme(.dark)
}
