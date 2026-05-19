import Foundation

struct ProfileLinks: Codable, Hashable {
    var github: String
    var linkedin: String
    var twitter: String
    var website: String

    init(github: String = "", linkedin: String = "",
         twitter: String = "", website: String = "") {
        self.github   = github
        self.linkedin = linkedin
        self.twitter  = twitter
        self.website  = website
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        github   = (try? c.decodeIfPresent(String.self, forKey: .github))   ?? ""
        linkedin = (try? c.decodeIfPresent(String.self, forKey: .linkedin)) ?? ""
        twitter  = (try? c.decodeIfPresent(String.self, forKey: .twitter))  ?? ""
        website  = (try? c.decodeIfPresent(String.self, forKey: .website))  ?? ""
    }
}
