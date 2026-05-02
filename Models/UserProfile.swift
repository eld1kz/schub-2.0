import Foundation

struct UserProfile: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String = ""
    var university: String = ""
    var graduationYear: Int = 0
    var bio: String = ""
    var skills: [String] = []
    var interests: [String] = []
    var openToCollaborate: Bool = true
    var avatarURL: String = ""

    enum CodingKeys: String, CodingKey {
        case id, name, university, bio, skills, interests
        case graduationYear = "graduation_year"
        case openToCollaborate = "open_to_collaborate"
        case avatarURL = "avatar_url"
    }

}

extension UserProfile {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        university = try c.decodeIfPresent(String.self, forKey: .university) ?? ""
        graduationYear = try c.decodeIfPresent(Int.self, forKey: .graduationYear) ?? 0
        bio = try c.decodeIfPresent(String.self, forKey: .bio) ?? ""
        skills = try c.decodeIfPresent([String].self, forKey: .skills) ?? []
        interests = try c.decodeIfPresent([String].self, forKey: .interests) ?? []
        openToCollaborate = try c.decodeIfPresent(Bool.self, forKey: .openToCollaborate) ?? true
        avatarURL = try c.decodeIfPresent(String.self, forKey: .avatarURL) ?? ""
    }
}
