import Foundation

struct Post: Codable, Identifiable {
    let id: UUID
    let authorId: UUID
    var content: String
    var imageURL: String
    let createdAt: Date
    var likesCount: Int
    var commentsCount: Int
    var repostsCount: Int

    enum CodingKeys: String, CodingKey {
        case id, content
        case authorId = "author_id"
        case imageURL = "image_url"
        case createdAt = "created_at"
        case likesCount = "likes_count"
        case commentsCount = "comments_count"
        case repostsCount = "reposts_count"
    }
}

extension Post {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id            = try c.decode(UUID.self, forKey: .id)
        authorId      = try c.decode(UUID.self, forKey: .authorId)
        content       = try c.decodeIfPresent(String.self, forKey: .content) ?? ""
        imageURL      = try c.decodeIfPresent(String.self, forKey: .imageURL) ?? ""
        createdAt     = try c.decode(Date.self, forKey: .createdAt)
        likesCount    = try c.decodeIfPresent(Int.self, forKey: .likesCount) ?? 0
        commentsCount = try c.decodeIfPresent(Int.self, forKey: .commentsCount) ?? 0
        repostsCount  = try c.decodeIfPresent(Int.self, forKey: .repostsCount) ?? 0
    }
}

struct FeedPost: Identifiable {
    var id: UUID { post.id }
    let post: Post
    let authorName: String
    let authorUniversity: String
}
