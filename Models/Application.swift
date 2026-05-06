import Foundation

struct Application: Codable, Identifiable {
    let id: UUID
    let ideaId: UUID
    let applicantId: UUID
    var applicantName: String
    var applicantUniversity: String
    let role: String
    let message: String
    var status: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, role, message, status
        case ideaId      = "idea_id"
        case applicantId = "applicant_id"
        case createdAt   = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id               = try c.decode(UUID.self,   forKey: .id)
        ideaId           = try c.decode(UUID.self,   forKey: .ideaId)
        applicantId      = try c.decode(UUID.self,   forKey: .applicantId)
        role             = (try? c.decodeIfPresent(String.self, forKey: .role)) ?? ""
        message          = (try? c.decodeIfPresent(String.self, forKey: .message)) ?? ""
        status           = (try? c.decodeIfPresent(String.self, forKey: .status)) ?? "pending"
        createdAt        = try c.decode(Date.self,   forKey: .createdAt)
        applicantName    = ""
        applicantUniversity = ""
    }

    init(id: UUID, ideaId: UUID, applicantId: UUID, applicantName: String,
         applicantUniversity: String, role: String, message: String,
         status: String, createdAt: Date) {
        self.id = id; self.ideaId = ideaId; self.applicantId = applicantId
        self.applicantName = applicantName; self.applicantUniversity = applicantUniversity
        self.role = role; self.message = message; self.status = status
        self.createdAt = createdAt
    }
}
