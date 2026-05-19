import SwiftUI
import Supabase

struct ProfileDetailView: View {
    let profile: UserProfile
    @State private var requestSent = false
    @State private var currentUserId: UUID?
    @State private var chatItem: ConversationItem?
    @State private var showChat = false
    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                heroCard

                HStack(spacing: 10) {
                    Button(requestSent ? "Pending" : "Connect") {
                        requestSent = true
                        Task { try? await ConnectionService().sendRequest(to: profile.id) }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(requestSent)

                    Button("Message") {
                        Task { await openChat() }
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(DesignTokens.cardFill)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .padding(.horizontal, 18)

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
        .task {
            currentUserId = try? await SupabaseService.shared.client.auth.session.user.id
        }
        .sheet(isPresented: $showChat) {
            if let item = chatItem, let myId = currentUserId {
                NavigationStack {
                    ChatView(conversation: item, currentUserId: myId)
                }
            }
        }
    }

    private func openChat() async {
        guard let myId = currentUserId else { return }
        let client = SupabaseService.shared.client
        let otherId = profile.id

        let remote: [Conversation] = (try? await client
            .from("conversations").select()
            .or("and(participant_one.eq.\(myId),participant_two.eq.\(otherId)),and(participant_one.eq.\(otherId),participant_two.eq.\(myId))")
            .limit(1).execute().value) ?? []

        let conv: Conversation
        if let found = remote.first {
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
            else { return }
            conv = inserted
        }

        chatItem = ConversationItem(
            conversation: conv,
            otherUserName: profile.name,
            otherUserAvatar: profile.avatarURL,
            unreadCount: 0
        )
        showChat = true
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .center, spacing: 16) {
                AvatarView(url: profile.avatarURL, name: profile.name, size: 78)
                    .overlay {
                        Circle().stroke(DesignTokens.separator, lineWidth: 1)
                    }
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

            HStack(spacing: 8) {
                statPill("\(profile.skills.count) skills")
                statPill("\(profile.interests.count) interests")
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
                            .background(
                                Capsule().fill(filled ? DesignTokens.accentPill : DesignTokens.fieldFill)
                            )
                            .overlay(
                                Capsule().stroke(filled ? Color.clear : DesignTokens.separator, lineWidth: 1)
                            )
                    }
                }
            }
        }
        .padding(.horizontal, 18)
    }

    private func sectionLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(DesignTokens.textTertiary)
            .tracking(0.8)
    }

    private func statPill(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(DesignTokens.textPrimary)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(DesignTokens.fieldFill)
            .clipShape(Capsule())
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
}
