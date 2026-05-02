import Foundation
import Supabase

@MainActor
@Observable
final class ProfileViewModel {
    var profile: UserProfile?
    var isLoading = false
    var errorMessage: String?

    private let db = SupabaseService.shared.client.from("profiles")
    private let auth = SupabaseService.shared.client.auth

    func loadProfile() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        print("[ProfileViewModel] loadProfile() started")

        guard let user = try? await auth.session.user else {
            print("[ProfileViewModel] auth.session.user failed — no active session")
            errorMessage = "Not signed in"
            return
        }

        print("[ProfileViewModel] user id: \(user.id)")

        if let existing: UserProfile = try? await db
            .select()
            .eq("id", value: user.id)
            .single()
            .execute()
            .value {
            print("[ProfileViewModel] loaded existing profile")
            profile = existing
        } else {
            print("[ProfileViewModel] no profile found — creating new one")
            let newProfile = buildNewProfile(for: user)
            try? await db.upsert(newProfile).execute()
            profile = newProfile
        }
    }

    func updateProfile(_ updated: UserProfile) async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await db.upsert(updated).execute()
            profile = updated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private struct UserMeta: Decodable {
        var name: String = ""
        var university: String = ""
        var graduationYear: Int = 0
        enum CodingKeys: String, CodingKey {
            case name, university
            case graduationYear = "graduation_year"
        }
    }

    private func buildNewProfile(for user: User) -> UserProfile {
        var meta = UserMeta()
        if let data = try? JSONEncoder().encode(user.userMetadata),
           let decoded = try? JSONDecoder().decode(UserMeta.self, from: data) {
            meta = decoded
        }
        return UserProfile(
            id: user.id,
            name: meta.name,
            university: meta.university,
            graduationYear: meta.graduationYear
        )
    }
}
