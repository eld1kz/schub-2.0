import SwiftUI
import Supabase

struct ProfileDetailView: View {
    let profile: UserProfile
    @State private var currentUserId: UUID?
    @State private var theirConnCount = 0
    @State private var mutualCount = 0
    @State private var chatSheet: ChatSheetData?
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                heroCard

                if let myId = currentUserId, myId != profile.id {
                    ConnectButton(
                        targetUserId: profile.id,
                        currentUserId: myId,
                        onMessage: { Task { await openChat() } }
                    )
                    .padding(.horizontal, 18)
                }

                aboutSection
                tagSection(title: "Skills", tags: profile.skills, filled: true)
                tagSection(title: "Interests", tags: profile.interests, filled: false)
            }
            .padding(.vertical, 18)
        }
        .background(DesignTokens.background.ignoresSafeArea())
        .navigationTitle(profile.name.isEmpty ? "Profile" : profile.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(DesignTokens.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await loadContext() }
        .sheet(item: $chatSheet) { data in
            NavigationStack {
                ChatView(conversation: data.item, currentUserId: data.myId)
            }
        }
    }

    // MARK: - Hero

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .center, spacing: 16) {
                AvatarView(url: profile.avatarURL, name: profile.name, size: 78)
                    .overlay { Circle().stroke(DesignTokens.separator, lineWidth: 1) }
                VStack(alignment: .leading, spacing: 6) {
                    Text(profile.name.isEmpty ? "Anonymous" : profile.name)
                        .font(.spaceGrotesk(26, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    if !profile.university.isEmpty || profile.graduationYear > 0 {
                        Text(
                            profile.graduationYear > 0 && !profile.university.isEmpty
                            ? "\(profile.university) · \(profile.graduationYear)"
                            : (!profile.university.isEmpty ? profile.university : "Class of \(profile.graduationYear)")
                        )
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(DesignTokens.textSecondary)
                    }
                    if profile.openToCollaborate {
                        Label("Open to Collaborate", systemImage: "checkmark.seal.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DesignTokens.collabGreen)
                    }
                }
                Spacer()
            }

            FlowRow(spacing: 8) {
                statPill("\(profile.skills.count) skills")
                statPill("\(profile.interests.count) interests")
                if theirConnCount > 0 {
                    statPill("\(theirConnCount) connections")
                }
                if mutualCount > 0 {
                    statPill("\(mutualCount) mutual", highlight: true)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [indigo.opacity(0.22), Color(hex: "#121827"), DesignTokens.cardFill],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(DesignTokens.separator, lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 24))
        .padding(.horizontal, 18)
    }

    // MARK: - About

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("ABOUT")
            Group {
                if profile.bio.isEmpty {
                    Text("This builder hasn't added a bio yet.")
                        .font(.system(size: 14))
                        .foregroundStyle(DesignTokens.textSecondary)
                } else {
                    Text(profile.bio)
                        .font(.system(size: 15))
                        .foregroundStyle(DesignTokens.textSecondary)
                        .lineSpacing(3)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.cardFill)
            .clipShape(.rect(cornerRadius: 16))
        }
        .padding(.horizontal, 18)
    }

    // MARK: - Tags

    private func tagSection(title: String, tags: [String], filled: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel(title.uppercased())
            if tags.isEmpty {
                Text("Nothing added yet.")
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.textSecondary)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(DesignTokens.cardFill)
                    .clipShape(.rect(cornerRadius: 16))
            } else {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 72), alignment: .leading)],
                    alignment: .leading,
                    spacing: 8
                ) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption.bold())
                            .foregroundStyle(filled ? DesignTokens.accentText : DesignTokens.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(Capsule().fill(filled ? DesignTokens.accentPill : DesignTokens.fieldFill))
                            .overlay(Capsule().stroke(filled ? Color.clear : DesignTokens.separator, lineWidth: 1))
                    }
                }
            }
        }
        .padding(.horizontal, 18)
    }

    // MARK: - Helpers

    private func sectionLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(DesignTokens.textTertiary)
            .tracking(0.8)
    }

    private func statPill(_ label: String, highlight: Bool = false) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(highlight ? indigo : DesignTokens.textPrimary)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(highlight ? indigo.opacity(0.12) : DesignTokens.fieldFill)
            .clipShape(Capsule())
    }

    // MARK: - Data

    private func loadContext() async {
        print("[ProfileDetail] loadContext start for profile: \(profile.id)")
        let client = SupabaseService.shared.client
        currentUserId = try? await client.auth.session.user.id
        print("[ProfileDetail] currentUserId: \(currentUserId?.uuidString ?? "nil")")

        struct ConnRow: Decodable {
            let senderId: UUID; let receiverId: UUID
            enum CodingKeys: String, CodingKey {
                case senderId = "sender_id"; case receiverId = "receiver_id"
            }
        }

        let theirConns: [ConnRow] = (try? await client
            .from("connections").select("sender_id,receiver_id")
            .or("sender_id.eq.\(profile.id),receiver_id.eq.\(profile.id)")
            .eq("status", value: "accepted")
            .execute().value) ?? []
        theirConnCount = theirConns.count
        print("[ProfileDetail] theirConnCount: \(theirConnCount)")

        guard let myId = currentUserId, myId != profile.id else { return }

        let myConns: [ConnRow] = (try? await client
            .from("connections").select("sender_id,receiver_id")
            .or("sender_id.eq.\(myId),receiver_id.eq.\(myId)")
            .eq("status", value: "accepted")
            .execute().value) ?? []

        let theirIds = Set(theirConns.map { $0.senderId == profile.id ? $0.receiverId : $0.senderId })
        let myIds = Set(myConns.map { $0.senderId == myId ? $0.receiverId : $0.senderId })
        mutualCount = theirIds.intersection(myIds).count
        print("[ProfileDetail] mutualCount: \(mutualCount)")
    }

    private func openChat() async {
        print("[ProfileDetail] openChat called, myId: \(currentUserId?.uuidString ?? "nil")")
        guard let myId = currentUserId else { return }
        let client = SupabaseService.shared.client
        let otherId = profile.id

        let remote: [Conversation] = (try? await client
            .from("conversations").select()
            .or("and(participant_one.eq.\(myId),participant_two.eq.\(otherId)),and(participant_one.eq.\(otherId),participant_two.eq.\(myId))")
            .limit(1).execute().value) ?? []

        let conv: Conversation
        if let found = remote.first {
            print("[ProfileDetail] existing conversation: \(found.id)")
            conv = found
        } else {
            let p1 = myId.uuidString < otherId.uuidString ? myId : otherId
            let p2 = myId.uuidString < otherId.uuidString ? otherId : myId
            struct C: Encodable {
                let participantOne: UUID; let participantTwo: UUID
                enum CodingKeys: String, CodingKey {
                    case participantOne = "participant_one"; case participantTwo = "participant_two"
                }
            }
            guard let inserted = (try? await client
                .from("conversations").insert(C(participantOne: p1, participantTwo: p2))
                .select().execute().value as [Conversation])?.first
            else {
                print("[ProfileDetail] openChat - failed to create conversation")
                return
            }
            print("[ProfileDetail] created conversation: \(inserted.id)")
            conv = inserted
        }

        let item = ConversationItem(
            conversation: conv,
            otherUserName: profile.name,
            otherUserAvatar: profile.avatarURL,
            unreadCount: 0
        )
        print("[ProfileDetail] presenting ChatSheet for conv: \(conv.id)")
        chatSheet = ChatSheetData(item: item, myId: myId)
    }
}

// MARK: - Supporting Types

private struct ChatSheetData: Identifiable {
    let item: ConversationItem
    let myId: UUID
    var id: UUID { item.id }
}

// MARK: - Flow Row

private struct FlowRow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview {
    NavigationStack {
        ProfileDetailView(profile: UserProfile(
            id: UUID(),
            name: "Eldar Ugay",
            university: "MIT",
            graduationYear: 2026,
            bio: "Building things at the intersection of AI and mobile.",
            skills: ["Swift", "SwiftUI", "Supabase"],
            interests: ["Music", "AI", "Travel"],
            openToCollaborate: true,
            avatarURL: ""
        ))
    }
    .preferredColorScheme(.dark)
}
