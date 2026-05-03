import Foundation

struct Comment: Codable, Identifiable {
    let id: UUID
    let ideaId: UUID
    let authorId: UUID
    let authorName: String
    let authorUniversity: String
    let content: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, content
        case ideaId           = "idea_id"
        case authorId         = "author_id"
        case authorName       = "author_name"
        case authorUniversity = "author_university"
        case createdAt        = "created_at"
    }
}
