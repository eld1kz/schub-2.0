import Foundation

@MainActor
@Observable
final class OpportunitiesViewModel {
    var opportunities: [Opportunity] = []
    var isLoading = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        opportunities = Self.hardcoded
    }

    private static let hardcoded: [Opportunity] = {
        let fmt = ISO8601DateFormatter()
        func date(_ s: String) -> Date { fmt.date(from: s) ?? Date() }
        return [
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000001")!,
                title: "Astana Hub Hackathon 2025",
                type: .hackathon,
                deadline: date("2025-09-15T00:00:00Z"),
                link: "https://astanahub.com",
                description: "48-hour hackathon for student builders in Kazakhstan. $10,000 prize pool across tracks in AI, FinTech, and GovTech.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000002")!,
                title: "Digital Almaty Hackathon",
                type: .hackathon,
                deadline: date("2025-10-20T00:00:00Z"),
                link: "https://digitalkz.kz",
                description: "City of Almaty's annual 36-hour hackathon focused on smart city and public services solutions. Open to all university students.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000003")!,
                title: "Bolashak Startup Grant",
                type: .grant,
                deadline: date("2025-11-01T00:00:00Z"),
                link: "https://bolashak.gov.kz",
                description: "Government seed grant up to ₸5,000,000 for early-stage student startups. Requires a registered entity and working prototype.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000004")!,
                title: "Zerde Innovation Grant",
                type: .grant,
                deadline: date("2025-12-10T00:00:00Z"),
                link: "https://zerde.gov.kz",
                description: "Zerde National IT Holdings offers R&D grants for student teams building solutions in digital infrastructure and e-government.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000005")!,
                title: "Kaspi.kz Summer Internship",
                type: .internship,
                deadline: date("2025-08-01T00:00:00Z"),
                link: "https://kaspi.kz/careers",
                description: "Paid software engineering internship at Kazakhstan's leading super-app. Tracks in iOS, backend, data, and product.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000006")!,
                title: "Kolesa Group Engineering Internship",
                type: .internship,
                deadline: date("2025-07-15T00:00:00Z"),
                link: "https://kolesa-group.kz",
                description: "3-month paid internship at Kolesa Group (Kolesa.kz, Krisha.kz, Auto.kz). Real projects, mentorship, and return offer track.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000007")!,
                title: "TechOrda Startup Competition",
                type: .competition,
                deadline: date("2025-10-05T00:00:00Z"),
                link: "https://techorda.kz",
                description: "Central Asia's premier startup pitch competition. Top 10 teams win mentorship, co-working space, and investor introductions.",
                createdAt: Date()
            ),
            Opportunity(
                id: UUID(uuidString: "00000001-0000-0000-0000-000000000008")!,
                title: "Central Asian Startup Awards",
                type: .competition,
                deadline: date("2025-11-30T00:00:00Z"),
                link: "https://startupkz.com",
                description: "Annual regional competition recognizing the most promising startups across Kazakhstan, Kyrgyzstan, and Uzbekistan.",
                createdAt: Date()
            ),
        ]
    }()
}
