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

    static let hardcoded: [Opportunity] = {
        func date(_ s: String) -> Date {
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd"
            return f.date(from: s) ?? Date()
        }
        func id(_ n: Int) -> UUID { UUID(uuidString: "00000001-0000-0000-0000-\(String(format: "%012d", n))")! }
        return [
            // Hackathons
            Opportunity(
                id: id(1),
                title: "Astana Hub Innovation Hackathon 2026",
                type: .hackathon,
                organization: "Astana Hub",
                location: "Astana, Kazakhstan",
                prize: "$15,000 prize pool",
                deadline: date("2026-06-20"),
                link: "https://astanahub.com",
                description: "48-hour hackathon for student builders across Kazakhstan. Tracks in AI, FinTech, GovTech, and HealthTech. Top teams pitch to a panel of VCs and government officials.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(2),
                title: "Digital Bridge Hackathon",
                type: .hackathon,
                organization: "Digital Bridge",
                location: "Astana, Kazakhstan",
                prize: "$10,000 + acceleration",
                deadline: date("2026-09-10"),
                link: "https://digitalbridge.kz",
                description: "Flagship tech event of Central Asia, bringing together 2,000+ developers from 30+ countries. Hackathon runs alongside the main forum with mentors from Google, Microsoft, and Yandex.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(3),
                title: "MLH Global Hack Week: AI",
                type: .hackathon,
                organization: "Major League Hacking",
                location: "Remote",
                prize: "Prizes + swag",
                deadline: date("2026-07-05"),
                link: "https://mlh.io",
                description: "Week-long online hackathon focused on AI/ML applications. Open to all students worldwide. Build projects using the latest models and APIs, with workshops from industry engineers.",
                createdAt: Date()
            ),
            // Grants
            Opportunity(
                id: id(4),
                title: "Bolashak Presidential Scholarship",
                type: .grant,
                organization: "Bolashak Program",
                location: "Kazakhstan (for study abroad)",
                prize: "Full scholarship",
                deadline: date("2026-08-01"),
                link: "https://bolashak.gov.kz",
                description: "Kazakhstan's flagship scholarship covering full tuition, living expenses, and travel for graduate study at top universities worldwide. Competitive selection with a 5-year return obligation.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(5),
                title: "NURIS Student Research Grant",
                type: .grant,
                organization: "NURIS",
                location: "Astana, Kazakhstan",
                prize: "Up to ₸3,000,000",
                deadline: date("2026-07-15"),
                link: "https://nuris.nu.edu.kz",
                description: "Research grants from Nazarbayev University Research and Innovation System for undergraduate and graduate students. Supports projects in STEM, social sciences, and entrepreneurship.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(6),
                title: "Zerde Digital Innovation Grant",
                type: .grant,
                organization: "Zerde National IT Holdings",
                location: "Remote / Kazakhstan",
                prize: "Up to ₸5,000,000",
                deadline: date("2026-10-30"),
                link: "https://zerde.gov.kz",
                description: "R&D grants for student teams building solutions in digital infrastructure, e-government, and public services. Requires a working prototype and university affiliation.",
                createdAt: Date()
            ),
            // Internships
            Opportunity(
                id: id(7),
                title: "Kaspi.kz Engineering Internship",
                type: .internship,
                organization: "Kaspi.kz",
                location: "Almaty, Kazakhstan",
                prize: "Paid · ₸350,000/mo",
                deadline: date("2026-06-01"),
                link: "https://kaspi.kz/careers",
                description: "3-month paid internship at Kazakhstan's leading super-app. Tracks in iOS, Android, backend, data engineering, and product management. Real projects from day one with a senior mentor.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(8),
                title: "EPAM Kazakhstan Software Internship",
                type: .internship,
                organization: "EPAM Kazakhstan",
                location: "Almaty / Remote",
                prize: "Paid · competitive",
                deadline: date("2026-06-30"),
                link: "https://www.epam.com/careers",
                description: "EPAM's Lab program offers hands-on internships for students in software engineering, QA, and UX. Interns work on real client projects and receive structured mentorship with a path to full-time hire.",
                createdAt: Date()
            ),
            // Competitions
            Opportunity(
                id: id(9),
                title: "TechOrda Startup Competition",
                type: .competition,
                organization: "TechOrda",
                location: "Almaty, Kazakhstan",
                prize: "₸10,000,000 + investment",
                deadline: date("2026-09-25"),
                link: "https://techorda.kz",
                description: "Central Asia's premier startup pitch competition. Top 10 teams win co-working space, mentorship from leading investors, and direct introductions to Almaty's VC ecosystem.",
                createdAt: Date()
            ),
            Opportunity(
                id: id(10),
                title: "JCI Kazakhstan Young Entrepreneur Award",
                type: .competition,
                organization: "JCI Kazakhstan",
                location: "Nur-Sultan, Kazakhstan",
                prize: "$5,000 + mentorship",
                deadline: date("2026-11-15"),
                link: "https://jci.cc",
                description: "Annual competition recognizing outstanding young entrepreneurs under 40 across Kazakhstan. Finalists present to a jury of business leaders and receive a year of structured mentorship.",
                createdAt: Date()
            ),
        ]
    }()
}
