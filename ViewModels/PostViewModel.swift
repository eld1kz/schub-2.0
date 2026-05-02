import Foundation
import Supabase

@MainActor
@Observable
final class PostViewModel {
    var title = ""
    var description = ""
    var skillsNeeded: [String] = []
    var stage: Idea.Stage = .idea
    var isLoading = false
    var errorMessage: String?
    var didSubmit = false

    private let auth = SupabaseService.shared.client.auth
    private let db = SupabaseService.shared.client.from("ideas")

    func submit() async {
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        guard !trimmedTitle.isEmpty else { return }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let userId = try await auth.session.user.id
            let payload = IdeaInsert(
                authorId: userId,
                title: trimmedTitle,
                description: description.trimmingCharacters(in: .whitespaces),
                skillsNeeded: skillsNeeded,
                stage: stage
            )
            try await db.insert(payload).execute()
            reset()
            didSubmit = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func reset() {
        title = ""
        description = ""
        skillsNeeded = []
        stage = .idea
    }
}

private struct IdeaInsert: Encodable {
    let authorId: UUID
    let title: String
    let description: String
    let skillsNeeded: [String]
    let stage: Idea.Stage

    enum CodingKeys: String, CodingKey {
        case title, description, stage
        case authorId = "author_id"
        case skillsNeeded = "skills_needed"
    }
}
