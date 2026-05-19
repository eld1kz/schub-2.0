import SwiftUI

private enum AppTab: Hashable {
    case feed
    case discover
    case opportunities
    case inbox
    case profile
}

struct AppView: View {
    @State private var selectedTab: AppTab = .feed
    @State private var showCreateSheet = false
    @State private var activeComposer: ComposerDestination?
    @State private var inboxVM = InboxViewModel()

    var body: some View {
        TabView(selection: $selectedTab) {
            FeedView(onCreateTap: presentCreateOptions)
                .tag(AppTab.feed)
                .tabItem { Label("Feed", systemImage: "house") }

            DiscoverView()
                .tag(AppTab.discover)
                .tabItem { Label("Discover", systemImage: "magnifyingglass") }

            OpportunitiesView()
                .tag(AppTab.opportunities)
                .tabItem { Label("Opportunities", systemImage: "sparkles.rectangle.stack") }

            InboxView(vm: inboxVM)
                .badge(inboxVM.totalUnread)
                .tag(AppTab.inbox)
                .tabItem { Label("Inbox", systemImage: "bubble.left.and.bubble.right") }

            ProfileView()
                .tag(AppTab.profile)
                .tabItem { Label("Profile", systemImage: "person") }
        }
        .sheet(isPresented: $showCreateSheet) {
            PostComposerSheet { destination in
                showCreateSheet = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    activeComposer = destination
                }
            }
            .presentationDetents([.height(320)])
            .presentationDragIndicator(.hidden)
            .presentationBackground(DesignTokens.background)
        }
        .fullScreenCover(item: $activeComposer) { destination in
            switch destination {
            case .update:
                UpdateComposerView {
                    activeComposer = nil
                }
            case .idea:
                IdeaComposerFlowView {
                    activeComposer = nil
                }
            }
        }
    }

    private func presentCreateOptions() {
        showCreateSheet = true
    }
}

#Preview {
    AppView()
}
