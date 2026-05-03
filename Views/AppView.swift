import SwiftUI

struct AppView: View {
    @State private var notifVM = NotificationsViewModel()

    var body: some View {
        TabView {
            FeedView()
                .tabItem { Label("Feed", systemImage: "house") }

            DiscoverView()
                .tabItem { Label("Discover", systemImage: "magnifyingglass") }

            PostView()
                .tabItem { Label("Post", systemImage: "plus.circle.fill") }

            NotificationsView(viewModel: notifVM)
                .tabItem { Label("Notifications", systemImage: "bell") }
                .badge(notifVM.unreadCount)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person") }
        }
        .task { await notifVM.load() }
    }
}

#Preview {
    AppView()
}
