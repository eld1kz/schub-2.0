import Foundation

struct Comment: Codable, Identifiable {
    let id: UUID
    let ideaId: UUID
    let authorId: UUID
    var authorName: String
    var authorUniversity: String
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

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id               = try c.decode(UUID.self,   forKey: .id)
        ideaId           = try c.decode(UUID.self,   forKey: .ideaId)
        authorId         = try c.decode(UUID.self,   forKey: .authorId)
        authorName       = try c.decodeIfPresent(String.self, forKey: .authorName) ?? ""
        authorUniversity = try c.decodeIfPresent(String.self, forKey: .authorUniversity) ?? ""
        content          = try c.decode(String.self, forKey: .content)
        createdAt        = try c.decode(Date.self,   forKey: .createdAt)
    }

    init(id: UUID, ideaId: UUID, authorId: UUID, authorName: String,
         authorUniversity: String, content: String, createdAt: Date) {
        self.id = id; self.ideaId = ideaId; self.authorId = authorId
        self.authorName = authorName; self.authorUniversity = authorUniversity
        self.content = content; self.createdAt = createdAt
    }
}
