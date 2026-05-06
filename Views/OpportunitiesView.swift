import SwiftUI

struct OpportunitiesView: View {
    @State private var viewModel = OpportunitiesViewModel()
    @State private var selectedType: Opportunity.OpportunityType? = nil

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar
                Rectangle()
                    .fill(DesignTokens.separator)
                    .frame(height: 1)
                if viewModel.isLoading && viewModel.opportunities.isEmpty {
                    ProgressView()
                        .tint(DesignTokens.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    opportunityList
                }
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .navigationTitle("Opportunities")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(DesignTokens.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task { await viewModel.load() }
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterPill(label: "All", color: Color(hex: "#4F46E5"), active: selectedType == nil) {
                    selectedType = nil
                }
                ForEach(Opportunity.OpportunityType.allCases, id: \.self) { type in
                    filterPill(label: type.displayLabel, color: type.badgeColor, active: selectedType == type) {
                        selectedType = selectedType == type ? nil : type
                    }
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
        }
        .background(DesignTokens.background)
    }

    private func filterPill(label: String, color: Color, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(active ? .white : DesignTokens.textSecondary)
                .padding(.horizontal, 14).padding(.vertical, 7)
                .background(active ? color : DesignTokens.fieldFill)
                .clipShape(.capsule)
                .overlay(
                    Capsule()
                        .stroke(active ? color.opacity(0.3) : DesignTokens.separator, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: active)
    }

    private var filtered: [Opportunity] {
        guard let t = selectedType else { return viewModel.opportunities }
        return viewModel.opportunities.filter { $0.type == t }
    }

    private var opportunityList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filtered) { opportunity in
                    OpportunityCardView(opportunity: opportunity)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
        .refreshable { await viewModel.load() }
    }
}

private extension Opportunity.OpportunityType {
    var badgeColor: Color {
        switch self {
        case .hackathon:   Color(hex: "#7C3AED")
        case .grant:       Color(hex: "#16A34A")
        case .internship:  Color(hex: "#2563EB")
        case .competition: Color(hex: "#EA580C")
        }
    }

    var displayLabel: String {
        switch self {
        case .hackathon:   "Hackathon"
        case .grant:       "Grant"
        case .internship:  "Internship"
        case .competition: "Competition"
        }
    }
}

#Preview {
    OpportunitiesView()
        .preferredColorScheme(.dark)
}
