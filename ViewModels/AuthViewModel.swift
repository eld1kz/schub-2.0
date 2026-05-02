import Foundation
import Supabase

@MainActor
@Observable
final class AuthViewModel {
    var isAuthenticated = false
    var isLoading = false
    var errorMessage: String?

    private let auth = SupabaseService.shared.client.auth

    init() {
        Task { await listenToAuthChanges() }
    }

    private func listenToAuthChanges() async {
        for await (_, session) in auth.authStateChanges {
            isAuthenticated = session != nil
        }
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signUp(name: String, email: String, password: String, university: String, graduationYear: Int) async {
        isLoading = true
        errorMessage = nil
        do {
            try await auth.signUp(
                email: email,
                password: password,
                data: [
                    "name": .string(name),
                    "university": .string(university),
                    "graduation_year": .integer(graduationYear)
                ]
            )
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
