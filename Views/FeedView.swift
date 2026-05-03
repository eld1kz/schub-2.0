import SwiftUI

private enum FeedTab { case posts, ideas }

struct FeedView: View {
    @State private var feedViewModel = FeedViewModel()
    @State private var postViewModel = PostFeedViewModel()
    @State private var activeTab: FeedTab = .posts
    @State private var showComposer = false
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack(alignment: .bottomTrailing) {
                VStack(spacing: 0) {
                    tabBar
                    Rectangle().fill(DesignTokens.separator).frame(height: 1)
                    tabContent
                }
                fab
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationTitle("Feed")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showComposer) {
                PostComposerSheet { content in try await postViewModel.createPost(content: content) }
                    .presentationDetents([.medium, .large])
                    .presentationBackground(DesignTokens.background)
            }
            .navigationDestination(for: FeedIdea.self) { idea in
                IdeaDetailView(
                    item: idea,
                    onCommentCountChange: { count in
                        feedViewModel.setCommentCount(ideaId: idea.id, count: count)
                    }
                )
            }
            .task {
                await postViewModel.load()
                await feedViewModel.loadFeed()
            }
        }
    }

    // MARK: Tab bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            tabButton("Posts", tab: .posts)
            tabButton("Ideas", tab: .ideas)
            Spacer()
        }
        .background(DesignTokens.background)
    }

    private func tabButton(_ label: String, tab: FeedTab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { activeTab = tab }
        } label: {
            VStack(spacing: 0) {
                Text(label)
                    .font(.system(size: 14, weight: activeTab == tab ? .bold : .medium))
                    .foregroundStyle(activeTab == tab ? DesignTokens.textPrimary : DesignTokens.textTertiary)
                    .padding(.vertical, 13).padding(.horizontal, 22)
                Rectangle()
                    .fill(activeTab == tab ? DesignTokens.accentText : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: Content

    @ViewBuilder
    private var tabContent: some View {
        switch activeTab {
        case .posts:
            if postViewModel.isLoading && postViewModel.posts.isEmpty {
                loadingView
            } else if postViewModel.posts.isEmpty {
                emptyState(icon: "bubble.left.and.bubble.right",
                           title: "No posts yet",
                           subtitle: "Be the first to share what you're building")
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(postViewModel.posts) { PostCard(item: $0) }
                    }
                }
                .refreshable { await postViewModel.load() }
            }
        case .ideas:
            if feedViewModel.isLoading && feedViewModel.ideas.isEmpty {
                loadingView
            } else if feedViewModel.ideas.isEmpty {
                emptyState(icon: "lightbulb",
                           title: "No ideas yet",
                           subtitle: "Be the first to share an idea")
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(feedViewModel.ideas) { item in
                            IdeaCardView(
                                item: item,
                                onConnect: { Task { try? await ConnectionService().sendRequest(to: item.idea.authorId) } },
                                isLiked: feedViewModel.likedIdeaIds.contains(item.idea.id),
                                onToggleLike: { Task { await feedViewModel.toggleLike(ideaId: item.idea.id) } },
                                onTap: {
                                    print("[FeedView] card body tapped — idea: \(item.id)")
                                    navigationPath.append(item)
                                    print("[FeedView] path count: \(navigationPath.count)")
                                },
                                onCommentTap: {
                                    print("[FeedView] onCommentTap fired — idea: \(item.id)")
                                    navigationPath.append(item)
                                    print("[FeedView] path count after comment tap: \(navigationPath.count)")
                                }
                            )
                        }
                    }
                    .padding(16)
                }
                .refreshable { await feedViewModel.loadFeed() }
            }
        }
    }

    // MARK: FAB

    private var fab: some View {
        Button { showComposer = true } label: {
            Image(systemName: "plus")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.black)
                .frame(width: 54, height: 54)
                .background(DesignTokens.accentText)
                .clipShape(Circle())
                .shadow(color: DesignTokens.accentText.opacity(0.4), radius: 12, x: 0, y: 4)
        }
        .padding(.trailing, 20).padding(.bottom, 24)
    }

    // MARK: Helpers

    private var loadingView: some View {
        ProgressView().tint(DesignTokens.textSecondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 44))
                .foregroundStyle(DesignTokens.textTertiary)
            Text(title)
                .font(.spaceGrotesk(18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    FeedView()
}
