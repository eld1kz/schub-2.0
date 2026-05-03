import SwiftUI

struct OpportunityCardView: View {
    let opportunity: Opportunity

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                typeBadge
                Spacer()
                deadlineLabel
            }

            Text(opportunity.title)
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)

            if !opportunity.description.isEmpty {
                Text(opportunity.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            if let url = URL(string: opportunity.link), !opportunity.link.isEmpty {
                HStack {
                    Spacer()
                    Link(destination: url) {
                        Label("View", systemImage: "arrow.up.right")
                            .font(.subheadline)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.07), radius: 6, y: 2)
    }

    private var typeBadge: some View {
        Text(opportunity.type.rawValue.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(opportunity.type.color.opacity(0.15))
            .foregroundStyle(opportunity.type.color)
            .clipShape(.capsule)
    }

    private var deadlineLabel: some View {
        Label(opportunity.deadline.formatted(date: .abbreviated, time: .omitted),
              systemImage: "calendar")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}

private extension Opportunity.OpportunityType {
    var color: Color {
        switch self {
        case .hackathon:   .orange
        case .grant:       .green
        case .internship:  .blue
        case .competition: .purple
        }
    }
}

#Preview {
    OpportunityCardView(opportunity: Opportunity(
        id: UUID(),
        title: "ETH Global Hackathon 2026",
        type: .hackathon,
        deadline: Date().addingTimeInterval(60 * 60 * 24 * 14),
        link: "https://ethglobal.com",
        description: "Build the future of decentralised apps with teams from around the world.",
        createdAt: Date()
    ))
    .padding()
}
