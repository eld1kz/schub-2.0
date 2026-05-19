import Foundation

struct ProfileExperience: Codable, Identifiable, Hashable {
    var id: UUID
    var role: String
    var company: String
    var startMonth: Int
    var startYear: Int
    var endMonth: Int?
    var endYear: Int?
    var isPresent: Bool
    var location: String
    var description: String

    init(
        id: UUID = UUID(),
        role: String = "",
        company: String = "",
        startMonth: Int = Calendar.current.component(.month, from: Date()),
        startYear: Int = Calendar.current.component(.year, from: Date()),
        endMonth: Int? = nil,
        endYear: Int? = nil,
        isPresent: Bool = true,
        location: String = "",
        description: String = ""
    ) {
        self.id = id
        self.role = role
        self.company = company
        self.startMonth = startMonth
        self.startYear = startYear
        self.endMonth = endMonth
        self.endYear = endYear
        self.isPresent = isPresent
        self.location = location
        self.description = description
    }

    static let monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                              "Jul","Aug","Sep","Oct","Nov","Dec"]

    var dateRangeString: String {
        func mn(_ m: Int) -> String { m >= 1 && m <= 12 ? Self.monthNames[m-1] : "" }
        let start = "\(mn(startMonth)) \(startYear)"
        if isPresent { return "\(start) — Present" }
        guard let em = endMonth, let ey = endYear else { return start }
        return "\(start) — \(mn(em)) \(ey)"
    }
}
