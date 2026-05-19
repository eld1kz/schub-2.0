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

        do {
            if let existing = try await fetchProfile(for: user.id) {
                profile = existing
            } else {
                let newProfile = buildNewProfile(for: user)
                try await db.upsert(newProfile).execute()
                profile = newProfile
            }
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
            return
        }

        let userId = user.id
        async let connections = loadConnectionsCount(userId: userId)
        async let ideas = loadIdeasCount(userId: userId)
        connectionsCount = (try? await connections) ?? 0
        ideasCount = (try? await ideas) ?? 0
    }

    func uploadAvatar(data: Data) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            guard let user = try? await auth.session.user else {
                errorMessage = "Not signed in"
                return
            }

            let currentProfile = try await resolveCurrentProfile(for: user)
            let jpegData = preparedAvatarData(from: data)
            let path = "\(user.id.uuidString.lowercased())/avatar.jpg"
            print("[Avatar] uploading \(jpegData.count) bytes to path: \(path)")

            try await client.storage
                .from("avatars")
                .upload(path, data: jpegData,
                        options: FileOptions(
                            cacheControl: "31536000",
                            contentType: "image/jpeg",
                            upsert: true
                        ))

            print("[Avatar] upload succeeded")

            let publicURL = try client.storage.from("avatars").getPublicURL(path: path)
            let urlWithBust = publicURL.absoluteString + "?t=\(Int(Date().timeIntervalSince1970))"
            print("[Avatar] public URL: \(urlWithBust)")

            var updated = currentProfile
            updated.avatarURL = urlWithBust
            try await db.upsert(updated).execute()
            self.profile = updated
            NotificationCenter.default.post(name: .schubProfileUpdated, object: nil)
            print("[Avatar] profile saved")
        } catch is CancellationError {
            return
        } catch {
            print("[Avatar] FAILED: \(error)")
            errorMessage = error.localizedDescription
        }
    }

    func updateProfile(_ updated: UserProfile) async {
        isLoading = true
        defer { isLoading = false }
        do {
            guard let user = try? await auth.session.user else {
                errorMessage = "Not signed in"
                return
            }

            let currentProfile = try await resolveCurrentProfile(for: user)
            let merged = mergedProfile(current: currentProfile, incoming: updated)

            try await db.upsert(merged).execute()
            profile = merged
            NotificationCenter.default.post(name: .schubProfileUpdated, object: nil)
        } catch is CancellationError {
            return
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

    private func resolveCurrentProfile(for user: User) async throws -> UserProfile {
        if let profile {
            return profile
        }

        if let existing = try await fetchProfile(for: user.id) {
            self.profile = existing
            return existing
        }

        let newProfile = buildNewProfile(for: user)
        try await db.upsert(newProfile).execute()
        self.profile = newProfile
        return newProfile
    }

    private func mergedProfile(current: UserProfile, incoming: UserProfile) -> UserProfile {
        var merged = incoming
        if merged.avatarURL.isEmpty {
            merged.avatarURL = current.avatarURL
        }
        return merged
    }

    private func fetchProfile(for userId: UUID) async throws -> UserProfile? {
        let profiles: [UserProfile] = try await db
            .select()
            .eq("id", value: userId)
            .limit(1)
            .execute()
            .value

        return profiles.first
    }

    private func preparedAvatarData(from data: Data) -> Data {
        guard let image = UIImage(data: data) else { return data }

        let maxDimension: CGFloat = 1200
        let resized = resizedImage(image, maxDimension: maxDimension)
        let targetBytes = 1_500_000
        let qualities: [CGFloat] = [0.82, 0.72, 0.6, 0.5, 0.4]

        for quality in qualities {
            if let jpegData = resized.jpegData(compressionQuality: quality), jpegData.count <= targetBytes {
                return jpegData
            }
        }

        return resized.jpegData(compressionQuality: 0.3) ?? data
    }

    private func resizedImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longestSide = max(size.width, size.height)
        guard longestSide > maxDimension else { return image }

        let scale = maxDimension / longestSide
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)

        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
