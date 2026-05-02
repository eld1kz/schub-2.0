import Foundation

struct UserProfile: Codable, Identifiable {
    let id: UUID
    var name: String = ""
    var university: String = ""
    var graduationYear: Int = 0
    var bio: String = ""
    var skills: [String] = []
    var interests: [String] = []
    var openToCollaborate: Bool = true
    var avatarURL: String = ""
}
