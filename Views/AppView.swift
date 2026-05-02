import SwiftUI

struct AppView: View {
    var body: some View {
        TabView {
            FeedView()
                .tabItem {
                    Label("Feed", systemImage: "house")
                }

            DiscoverView()
                .tabItem {
                    Label("Discover", systemImage: "magnifyingglass")
                }

            PostView()
                .tabItem {
                    Label("Post", systemImage: "plus.circle.fill")
                }

            NotificationsView()
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
        }
    }
}

#Preview {
    AppView()
}




