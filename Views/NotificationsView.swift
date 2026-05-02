import SwiftUI

struct NotificationsView: View {
    @State private var viewModel = NotificationsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.requests.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.requests.isEmpty {
                    emptyState
                } else {
                    requestList
                }
            }
            .navigationTitle("Notifications")
            .task { await viewModel.loadRequests() }
        }
    }

    private var requestList: some View {
        List(viewModel.requests) { request in
            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(request.senderName)
                        .font(.headline)
                    if !request.senderUniversity.isEmpty {
                        Text(request.senderUniversity)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Text("wants to connect with you")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack {
                    Spacer()
                    Button("Decline") {
                        Task { await viewModel.respond(to: request, accept: false) }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    Button("Accept") {
                        Task { await viewModel.respond(to: request, accept: true) }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                }
            }
            .padding(.vertical, 4)
        }
        .refreshable { await viewModel.loadRequests() }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "bell.slash")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No requests yet")
                .font(.headline)
            Text("Connection requests will appear here")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NotificationsView()
}
