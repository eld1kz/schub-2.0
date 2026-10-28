import SwiftUI

private enum FeedTab { case posts, ideas }

struct FeedView: View {
    var onCreateTap: () -> Void = {}

    @State private var feedViewModel = FeedViewModel()
    @State private var postViewModel = PostFeedViewModel()
    @State private var notifVM = NotificationsViewModel()
    @State private var activeTab: FeedTab = .posts
    @State private var showNotifications = false
    @State private var navigationPath = NavigationPath()
    @State private var applyingTo: FeedIdea? = nil

    private let indigo = Color(hex: "#4F46E5")

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
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Schub")
                        .font(.spaceGrotesk(22, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNotifications = true } label: {
                        Image(systemName: "bell")
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(DesignTokens.textPrimary)
                            .overlay(alignment: .topTrailing) {
                                if notifVM.unreadCount > 0 {
                                    Circle()
                                        .fill(.red)
                                        .frame(width: 8, height: 8)
                                        .offset(x: 3, y: -3)
                                }
                            }
                    }
                }
            }
            .sheet(item: $applyingTo) { feedIdea in
                ApplySheet(idea: feedIdea.idea) {
                    feedViewModel.appliedIdeaIds.insert(feedIdea.id)
                }
            }
            .navigationDestination(for: FeedIdea.self) { idea in
                IdeaDetailView(
                    item: idea,
                    onCommentCountChange: { count in
                        feedViewModel.setCommentCount(ideaId: idea.id, count: count)
                    }
                )
            }
            .navigationDestination(for: FeedPost.self) { post in
                PostDetailView(item: post)
            }
            .navigationDestination(isPresented: $showNotifications) {
                NotificationsView(viewModel: notifVM)
            }
            .task {
                await postViewModel.load()
                await feedViewModel.loadFeed()
                await notifVM.load()
            }
            .onReceive(NotificationCenter.default.publisher(for: .schubContentCreated)) { _ in
                Task {
                    await postViewModel.load()
                    await feedViewModel.loadFeed()
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .schubProfileUpdated)) { _ in
                Task {
                    await postViewModel.load()
                    await feedViewModel.loadFeed()
                    await notifVM.load()
                }
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
                    .fill(activeTab == tab ? indigo : Color.clear)
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
            } else if let error = postViewModel.errorMessage, postViewModel.posts.isEmpty {
                statusState(
                    icon: "wifi.exclamationmark",
                    title: "Couldn't load posts",
                    subtitle: humanized(error),
                    actionTitle: "Try again"
                ) {
                    Task { await postViewModel.load() }
                }
            } else if postViewModel.posts.isEmpty {
                statusState(
                    icon: "bubble.left.and.bubble.right",
                    title: "No posts yet",
                    subtitle: "Share a quick update and set the tone for the feed."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(postViewModel.posts) { item in
                            NavigationLink(value: item) {
                                PostCard(
                                    item: item,
                                    isLiked: postViewModel.likedPostIds.contains(item.id),
                                    isReposted: postViewModel.repostedPostIds.contains(item.id),
                                    onCommentTap: {
                                        print("[FeedView] post comment tapped")
                                        navigationPath.append(item)
                                    },
                                    onRepost: { Task { await postViewModel.toggleRepost(post: item) } },
                                    onToggleLike: { Task { await postViewModel.toggleLike(post: item) } }
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .refreshable { await postViewModel.load() }
            }
        case .ideas:
            if feedViewModel.isLoading && feedViewModel.ideas.isEmpty {
                loadingView
            } else if let error = feedViewModel.errorMessage, feedViewModel.ideas.isEmpty {
                statusState(
                    icon: "wifi.exclamationmark",
                    title: "Couldn't load ideas",
                    subtitle: humanized(error),
                    actionTitle: "Try again"
                ) {
                    Task { await feedViewModel.loadFeed() }
                }
            } else if feedViewModel.ideas.isEmpty {
                statusState(
                    icon: "lightbulb",
                    title: "No ideas yet",
                    subtitle: "Post an idea when you're ready to find people and start building."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(feedViewModel.ideas) { item in
                            NavigationLink(value: item) {
                                IdeaCardView(
                                    item: item,
                                    myUserId: feedViewModel.myUserId,
                                    alreadyApplied: feedViewModel.appliedIdeaIds.contains(item.id),
                                    onApplyTap: { applyingTo = item },
                                    isLiked: feedViewModel.likedIdeaIds.contains(item.idea.id),
                                    isReposted: feedViewModel.repostedIdeaIds.contains(item.idea.id),
                                    onToggleLike: { Task { await feedViewModel.toggleLike(ideaId: item.idea.id) } },
                                    onRepost: { Task { await feedViewModel.toggleIdeaRepost(idea: item) } },
                                    onCommentTap: {
                                        print("[FeedView] comment tapped")
                                        navigationPath.append(item)
                                    }
                                )
                            }
                            .buttonStyle(.plain)
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
        Button(action: onCreateTap) {
            Image(systemName: "plus")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 54, height: 54)
                .background(indigo)
                .clipShape(Circle())
                .shadow(color: indigo.opacity(0.4), radius: 12, x: 0, y: 4)
        }
        .padding(.trailing, 20).padding(.bottom, 24)
    }

    // MARK: Helpers

    private var loadingView: some View {
        ProgressView().tint(DesignTokens.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.top, 48)
    }

    private func statusState(
        icon: String,
        title: String,
        subtitle: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) -> some View {
        VStack {
            StatusCardView(
                icon: icon,
                title: title,
                subtitle: subtitle,
                actionTitle: actionTitle,
                action: action
            )
            .padding(20)
            Spacer()
        }
    }

    private func humanized(_ error: String) -> String {
        if error.localizedCaseInsensitiveContains("cancel") {
            return "Give it another second and try again."
        }
        return "Check your connection and try again."
    }
}

#Preview {
    FeedView()
}
