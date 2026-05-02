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

    enum CodingKeys: String, CodingKey {
        case id, title, description, stage
        case authorId = "author_id"
        case skillsNeeded = "skills_needed"
        case createdAt = "created_at"
        case likesCount = "likes_count"
    }
}
