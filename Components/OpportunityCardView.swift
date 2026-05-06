import SwiftUI

struct OpportunityCardView: View {
    let opportunity: Opportunity

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top row: badge + deadline
            HStack(alignment: .center) {
                typeBadge
                Spacer()
                deadlineLabel
            }
            .padding(.bottom, 10)

            // Title
            Text(opportunity.title)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 3)

            // Org + location
            HStack(spacing: 4) {
                Text(opportunity.organization)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(DesignTokens.textSecondary)
                if !opportunity.location.isEmpty {
                    Text("·")
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.textTertiary)
                    Text(opportunity.location)
                        .font(.system(size: 12))
                        .foregroundStyle(DesignTokens.textSecondary)
                }
            }
            .padding(.bottom, 10)

            // Description
            if !opportunity.description.isEmpty {
                Text(opportunity.description)
                    .font(.system(size: 13))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 12)
            }

            // Prize + View button
            HStack(alignment: .center) {
                if !opportunity.prize.isEmpty {
                    HStack(spacing: 5) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(opportunity.type.badgeColor)
                        Text(opportunity.prize)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(opportunity.type.badgeColor)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(opportunity.type.badgeColor.opacity(0.08))
                    .clipShape(.capsule)
                }
                Spacer()
                if let url = URL(string: opportunity.link), !opportunity.link.isEmpty {
                    Link(destination: url) {
                        HStack(spacing: 4) {
                            Text("View")
                                .font(.system(size: 13, weight: .semibold))
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .background(Color(hex: "#4F46E5"))
                        .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.cardFill)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var typeBadge: some View {
        Text(opportunity.type.displayLabel)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(opportunity.type.badgeColor)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(opportunity.type.badgeColor.opacity(0.12))
            .clipShape(.capsule)
    }

    private var isClosingSoon: Bool {
        opportunity.deadline.timeIntervalSinceNow < 7 * 24 * 3600
    }

    private var deadlineLabel: some View {
        HStack(spacing: 4) {
            Image(systemName: "calendar")
                .font(.system(size: 11))
            Text(opportunity.deadline.formatted(.dateTime.month(.abbreviated).day().year()))
                .font(.system(size: 12))
        }
        .foregroundStyle(isClosingSoon ? Color.red : Color(hex: "#6B7280"))
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
    ScrollView {
        VStack(spacing: 12) {
            ForEach(Opportunity.OpportunityType.allCases, id: \.self) { type in
                OpportunityCardView(opportunity: Opportunity(
                    id: UUID(),
                    title: "Sample \(type.rawValue.capitalized) Opportunity",
                    type: type,
                    organization: "Sample Org",
                    location: "Almaty, Kazakhstan",
                    prize: "$10,000",
                    deadline: Date().addingTimeInterval(60 * 60 * 24 * 30),
                    link: "https://example.com",
                    description: "This is a sample description for the opportunity card. It shows how the card looks with two lines of text.",
                    createdAt: Date()
                ))
            }
        }
        .padding()
    }
    .background(Color(hex: "#F3F4F6"))
}
