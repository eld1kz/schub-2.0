import Foundation
import Supabase
import Auth

struct ApplicationService {
    private let client = SupabaseService.shared.client

    func apply(ideaId: UUID, role: String, message: String) async throws {
        let userId = try await client.auth.session.user.id
        struct Insert: Encodable {
            let ideaId: UUID; let applicantId: UUID; let role: String; let message: String
            enum CodingKeys: String, CodingKey {
                case role, message
                case ideaId      = "idea_id"
                case applicantId = "applicant_id"
            }
        }
        try await client.from("applications")
            .insert(Insert(ideaId: ideaId, applicantId: userId, role: role, message: message))
            .execute()
    }

    func fetchApplications(for ideaId: UUID) async throws -> [Application] {
        try await client.from("applications").select()
            .eq("idea_id", value: ideaId.uuidString)
            .order("created_at", ascending: true)
            .execute().value
    }

    func updateStatus(applicationId: UUID, status: String) async throws {
        struct Update: Encodable { let status: String }
        try await client.from("applications")
            .update(Update(status: status))
            .eq("id", value: applicationId.uuidString)
            .execute()
    }

    func hasApplied(to ideaId: UUID) async -> Bool {
        guard let userId = try? await client.auth.session.user.id else { return false }
        struct R: Decodable { let id: UUID }
        let result: [R] = (try? await client.from("applications").select("id")
            .eq("idea_id", value: ideaId.uuidString)
            .eq("applicant_id", value: userId.uuidString)
            .execute().value) ?? []
        return !result.isEmpty
    }
}
