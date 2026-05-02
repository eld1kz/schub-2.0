import SwiftUI

struct OpportunitiesView: View {
    @State private var viewModel = OpportunitiesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.opportunities.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.errorMessage, viewModel.opportunities.isEmpty {
                    errorView(error)
                } else if viewModel.opportunities.isEmpty {
                    emptyState
                } else {
                    opportunityList
                }
            }
            .navigationTitle("Opportunities")
            .task { await viewModel.load() }
        }
    }

    private var opportunityList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.opportunities) { opportunity in
                    OpportunityCardView(opportunity: opportunity)
                }
            }
            .padding()
        }
        .refreshable { await viewModel.load() }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "briefcase")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No opportunities yet")
                .font(.headline)
            Text("Check back soon")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text("Couldn't load opportunities")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await viewModel.load() } }
                .buttonStyle(.bordered)
        }
        .padding()
    }
}

#Preview {
    OpportunitiesView()
}
