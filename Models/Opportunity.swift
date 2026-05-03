import Foundation

struct Opportunity: Codable, Identifiable {
    let id: UUID
    var title: String
    var type: OpportunityType
    var deadline: Date
    var link: String
    var description: String
    let createdAt: Date

    enum OpportunityType: String, Codable, CaseIterable {
        case hackathon
        case grant
        case internship
        case competition
    }
}
