import Foundation
import Supabase

@MainActor
@Observable
final class DiscoverViewModel {
    var profiles: [UserProfile] = []
    var selectedSkill = ""
    var selectedUniversity = ""
    var isLoading = false
    var errorMessage: String?

    var availableSkills: [String] {
        Array(Set(profiles.flatMap { $0.skills })).sorted()
    }

    var availableUniversities: [String] {
        Array(Set(profiles.compactMap { $0.university.isEmpty ? nil : $0.university })).sorted()
    }

    var filteredProfiles: [UserProfile] {
        profiles.filter { profile in
            let skillMatch = selectedSkill.isEmpty || profile.skills.contains(selectedSkill)
            let uniMatch = selectedUniversity.isEmpty || profile.university == selectedUniversity
            return skillMatch && uniMatch
        }
    }

    func loadProfiles() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            profiles = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
