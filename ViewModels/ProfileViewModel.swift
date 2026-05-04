import Foundation
import UIKit
import Supabase

@MainActor
@Observable
final class ProfileViewModel {
    var profile: UserProfile?
    var connectionsCount = 0
    var ideasCount = 0
    var isLoading = false
    var errorMessage: String?

    private let db = SupabaseService.shared.client.from("profiles")
    private let client = SupabaseService.shared.client
    private let auth = SupabaseService.shared.client.auth

    func loadProfile() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard let user = try? await auth.session.user else {
            errorMessage = "Not signed in"
            return
        }

        if let existing: UserProfile = try? await db
            .select()
            .eq("id", value: user.id)
            .single()
            .execute()
            .value {
            profile = existing
        } else {
            let newProfile = buildNewProfile(for: user)
            try? await db.upsert(newProfile).execute()
            profile = newProfile
        }

        let userId = user.id
        async let connections = loadConnectionsCount(userId: userId)
        async let ideas = loadIdeasCount(userId: userId)
        connectionsCount = (try? await connections) ?? 0
        ideasCount = (try? await ideas) ?? 0
    }

    func uploadAvatar(data: Data) async {
        guard let profile else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let jpegData = UIImage(data: data).flatMap { $0.jpegData(compressionQuality: 0.8) } ?? data
            let path = "\(profile.id.uuidString).jpg"
            print("[Avatar] uploading \(jpegData.count) bytes to path: \(path)")
            try await client.storage
                .from("avatars")
                .upload(path: path, file: jpegData,
                        options: FileOptions(contentType: "image/jpeg", upsert: true))
            print("[Avatar] upload succeeded")
            let publicURL = try client.storage.from("avatars").getPublicURL(path: path)
            let urlWithBust = publicURL.absoluteString + "?t=\(Int(Date().timeIntervalSince1970))"
            print("[Avatar] public URL: \(urlWithBust)")
            var updated = profile
            updated.avatarURL = urlWithBust
            try await db.upsert(updated).execute()
            self.profile = updated
            print("[Avatar] profile saved")
        } catch {
            print("[Avatar] FAILED: \(error)")
            errorMessage = error.localizedDescription
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

    private func loadConnectionsCount(userId: UUID) async throws -> Int {
        struct R: Decodable { let id: UUID }
        let records: [R] = try await client
            .from("connections")
            .select("id")
            .or("sender_id.eq.\(userId),receiver_id.eq.\(userId)")
            .eq("status", value: "accepted")
            .execute()
            .value
        return records.count
    }

    private func loadIdeasCount(userId: UUID) async throws -> Int {
        struct R: Decodable { let id: UUID }
        let records: [R] = try await client
            .from("ideas")
            .select("id")
            .eq("author_id", value: userId.uuidString)
            .execute()
            .value
        return records.count
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
