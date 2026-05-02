import Foundation

struct Connection: Codable, Identifiable {
    let id: UUID
    let senderId: UUID
    let receiverId: UUID
    var status: Status
    let createdAt: Date

    enum Status: String, Codable {
        case pending
        case accepted
        case declined
    }
}
