import SwiftUI

struct FeedView: View {
    @State private var viewModel = FeedViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.ideas.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.errorMessage, viewModel.ideas.isEmpty {
                    errorView(error)
                } else {
                    feedList
                }
            }
            .navigationTitle("Feed")
            .task { await viewModel.loadFeed() }
        }
    }

    private var feedList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.ideas) { item in
                    IdeaCardView(item: item) {
                        Task { try? await ConnectionService().sendRequest(to: item.idea.authorId) }
                    }
                }
            }
            .padding()
        }
        .refreshable { await viewModel.loadFeed() }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text("Couldn't load feed")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await viewModel.loadFeed() }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }
}

#Preview {
    FeedView()
}
