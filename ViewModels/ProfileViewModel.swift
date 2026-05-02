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
        defer { isLoading = false }
        guard let userId = try? await auth.session.user.id else { return }
        profile = (try? await db
            .select()
            .eq("id", value: userId)
            .single()
            .execute()
            .value)
            ?? UserProfile(id: userId)
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
}
