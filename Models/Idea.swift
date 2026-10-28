import Foundation

struct Idea: Codable, Identifiable {
    let id: UUID
    let authorId: UUID
    var title: String
    var description: String
    var skillsNeeded: [String]
    var rolesNeeded: [String] = []
    var stage: Stage
    let createdAt: Date
    var likesCount: Int

    enum Stage: String, Codable, CaseIterable {
        case idea
        case building
        case launched
    }

    var commentsCount: Int = 0
    var repostsCount: Int = 0

    enum CodingKeys: String, CodingKey {
        case id, title, description, stage
        case authorId      = "author_id"
        case skillsNeeded  = "skills_needed"
        case rolesNeeded   = "roles_needed"
        case createdAt     = "created_at"
        case likesCount    = "likes_count"
        case commentsCount = "comments_count"
        case repostsCount  = "reposts_count"
    }
}

extension Idea {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id            = try c.decode(UUID.self,    forKey: .id)
        authorId      = try c.decode(UUID.self,    forKey: .authorId)
        title         = try c.decode(String.self,  forKey: .title)
        description   = try c.decode(String.self,  forKey: .description)
        skillsNeeded  = (try? c.decode([String].self, forKey: .skillsNeeded)) ?? []
        rolesNeeded   = (try? c.decode([String].self, forKey: .rolesNeeded)) ?? []
        stage         = (try? c.decode(Stage.self, forKey: .stage)) ?? .idea
        createdAt     = try c.decode(Date.self,    forKey: .createdAt)
        likesCount    = (try? c.decode(Int.self,   forKey: .likesCount)) ?? 0
        commentsCount = (try? c.decode(Int.self,   forKey: .commentsCount)) ?? 0
        repostsCount  = (try? c.decode(Int.self,   forKey: .repostsCount)) ?? 0
    }
}
