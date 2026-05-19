import Foundation

struct ProfileEducation: Codable, Identifiable, Hashable {
    var id: UUID
    var school: String
    var degree: String
    var field: String
    var startYear: Int
    var endYear: Int
    var gpa: String
    var description: String

    init(
        id: UUID = UUID(),
        school: String = "",
        degree: String = "",
        field: String = "",
        startYear: Int = Calendar.current.component(.year, from: Date()),
        endYear: Int = 0,
        gpa: String = "",
        description: String = ""
    ) {
        self.id = id
        self.school = school
        self.degree = degree
        self.field = field
        self.startYear = startYear
        self.endYear = endYear
        self.gpa = gpa
        self.description = description
    }

    var dateRangeString: String {
        endYear > 0 ? "\(startYear) — \(endYear)" : "\(startYear) — Present"
    }

    var subtitleLine: String {
        var parts: [String] = []
        if !degree.isEmpty { parts.append(degree) }
        if !field.isEmpty  { parts.append(field) }
        return parts.joined(separator: " · ")
    }
}
