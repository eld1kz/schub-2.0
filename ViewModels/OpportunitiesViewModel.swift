import Foundation
import Supabase

@MainActor
@Observable
final class OpportunitiesViewModel {
    var opportunities: [Opportunity] = []
    var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            opportunities = try await SupabaseService.shared.client
                .from("opportunities")
                .select()
                .order("deadline", ascending: true)
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
