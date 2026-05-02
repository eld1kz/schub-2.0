import Foundation

struct Idea: Codable, Identifiable {
    let id: UUID
    let authorId: UUID
    var title: String
    var description: String
    var skillsNeeded: [String]
    var stage: Stage
    let createdAt: Date
    let likesCount: Int

    enum Stage: String, Codable, CaseIterable {
        case idea
        case building
        case launched
    }
}
