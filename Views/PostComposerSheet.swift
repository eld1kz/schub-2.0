import SwiftUI
import Supabase
import Auth

enum ComposerDestination: String, Identifiable {
    case update
    case idea

    var id: String { rawValue }
}

extension Notification.Name {
    static let schubContentCreated = Notification.Name("schubContentCreated")
    static let schubProfileUpdated = Notification.Name("schubProfileUpdated")
}

struct PostComposerSheet: View {
    let onSelect: (ComposerDestination) -> Void

    private let indigo = Color(hex: "#4F46E5")

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Capsule()
                .fill(DesignTokens.separator)
                .frame(width: 44, height: 5)
                .frame(maxWidth: .infinity)
                .padding(.top, 12)

            Text("What do you want to share?")
                .font(.spaceGrotesk(28, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
                .padding(.horizontal, 20)
                .padding(.top, 6)

            VStack(spacing: 12) {
                optionCard(
                    emoji: "✏️",
                    title: "Share an update",
                    subtitle: "What are you building?"
                ) {
                    onSelect(.update)
                }

                optionCard(
                    emoji: "💡",
                    title: "Post an idea",
                    subtitle: "Looking for teammates?"
                ) {
                    onSelect(.idea)
                }
            }
            .padding(.horizontal, 16)

            Spacer(minLength: 8)
        }
        .background(DesignTokens.background)
    }

    private func optionCard(
        emoji: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Text(emoji)
                    .font(.system(size: 30))
                    .frame(width: 52, height: 52)
                    .background(indigo.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.spaceGrotesk(20, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(DesignTokens.textSecondary)
                }

                Spacer()

                Image(systemName: "arrow.right")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(indigo)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(DesignTokens.cardFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(indigo.opacity(0.22), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

struct UpdateComposerView: View {
    let onDismiss: () -> Void

    @State private var postViewModel = PostFeedViewModel()
    @State private var profile: UserProfile?
    @State private var content = ""
    @State private var isPosting = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    private let maxChars = 280
    private let indigo = Color(hex: "#4F46E5")

    private var trimmedContent: String {
        content.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                composerBody
            }
            .background(DesignTokens.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                bottomBar
                    .background(DesignTokens.background)
            }
        }
        .task {
            await loadProfile()
            isFocused = true
        }
    }

    private var header: some View {
        HStack {
            Button("Cancel", action: onDismiss)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DesignTokens.textSecondary)

            Spacer()

            Button {
                Task { await submitPost() }
            } label: {
                Group {
                    if isPosting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Post")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(minWidth: 78)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(indigo)
                .clipShape(Capsule())
                .opacity(trimmedContent.isEmpty || isPosting ? 0.45 : 1)
            }
            .disabled(trimmedContent.isEmpty || isPosting)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 16)
    }

    private var composerBody: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 14) {
                AvatarView(
                    url: profile?.avatarURL ?? "",
                    name: profile?.name ?? "You",
                    size: 48
                )

                ZStack(alignment: .topLeading) {
                    TextEditor(text: $content)
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(DesignTokens.textPrimary)
                        .scrollContentBackground(.hidden)
                        .focused($isFocused)
                        .onChange(of: content) { _, newValue in
                            if newValue.count > maxChars {
                                content = String(newValue.prefix(maxChars))
                            }
                        }

                    if content.isEmpty {
                        Text("What are you working on today?")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundStyle(DesignTokens.textTertiary)
                            .padding(.top, 8)
                            .padding(.leading, 5)
                            .allowsHitTesting(false)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
            .padding(.horizontal, 20)

            if let errorMessage {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 20)
            }

            Spacer()
        }
    }

    private var bottomBar: some View {
        HStack {
            Button {} label: {
                Image(systemName: "photo")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(indigo)
                    .frame(width: 42, height: 42)
                    .background(indigo.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            Text("\(content.count)/\(maxChars)")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(content.count >= maxChars ? .red : DesignTokens.textSecondary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    private func loadProfile() async {
        let client = SupabaseService.shared.client
        do {
            let userId = try await client.auth.session.user.id
            let loadedProfile: UserProfile = try await client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
            profile = loadedProfile
        } catch {
            profile = nil
        }
    }

    private func submitPost() async {
        guard !trimmedContent.isEmpty else { return }
        isPosting = true
        errorMessage = nil
        defer { isPosting = false }

        do {
            try await postViewModel.createPost(content: trimmedContent)
            NotificationCenter.default.post(name: .schubContentCreated, object: nil)
            onDismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct IdeaComposerFlowView: View {
    let onDismiss: () -> Void

    @State private var step = 0
    @State private var ideaText = ""
    @State private var selectedRoles: [String] = []
    @State private var skillsNeeded: [String] = []
    @State private var stage: Idea.Stage = .idea
    @State private var isPosting = false
    @State private var errorMessage: String?
    @State private var transitionEdge: Edge = .trailing
    @FocusState private var isIdeaFocused: Bool

    private let roles = ["Developer", "Designer", "Marketer", "Business", "Data", "Other"]
    private let indigo = Color(hex: "#4F46E5")

    private var canAdvance: Bool {
        switch step {
        case 0: !ideaText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        default: true
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                topBar
                progressDots
                stepContent
                Spacer()
                footerButton
            }
            .background(DesignTokens.background.ignoresSafeArea())
        }
        .task { isIdeaFocused = true }
    }

    private var topBar: some View {
        HStack {
            Button(step == 0 ? "Cancel" : "Back") {
                if step == 0 {
                    onDismiss()
                } else {
                    moveBackward()
                }
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(DesignTokens.textSecondary)

            Spacer()

            Text(stepTitle)
                .font(.spaceGrotesk(18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            Spacer()

            Color.clear
                .frame(width: 54, height: 20)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 14)
    }

    private var progressDots: some View {
        HStack(spacing: 8) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(index <= step ? indigo : DesignTokens.separator)
                    .frame(width: 10, height: 10)
            }
        }
        .padding(.bottom, 28)
    }

    private var stepContent: some View {
        ZStack {
            switch step {
            case 0:
                ideaStep
                    .transition(.move(edge: transitionEdge).combined(with: .opacity))
            case 1:
                teamStep
                    .transition(.move(edge: transitionEdge).combined(with: .opacity))
            default:
                stageStep
                    .transition(.move(edge: transitionEdge).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.9), value: step)
    }

    private var ideaStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("What's your idea?")
                .font(.spaceGrotesk(32, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            Text("Describe it in a few sentences")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DesignTokens.textSecondary)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(DesignTokens.cardFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .stroke(indigo.opacity(0.22), lineWidth: 1)
                    )

                TextEditor(text: $ideaText)
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(DesignTokens.textPrimary)
                    .scrollContentBackground(.hidden)
                    .padding(20)
                    .frame(minHeight: 260)
                    .focused($isIdeaFocused)

                if ideaText.isEmpty {
                    Text("A campus marketplace for student makers, but easier to trust and actually fun to use...")
                        .font(.system(size: 21, weight: .medium))
                        .foregroundStyle(DesignTokens.textTertiary)
                        .padding(.horizontal, 25)
                        .padding(.top, 28)
                        .allowsHitTesting(false)
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundStyle(.red)
            }
        }
        .padding(.horizontal, 20)
    }

    private var teamStep: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("What kind of people do you need?")
                    .font(.spaceGrotesk(30, weight: .bold))
                    .foregroundStyle(DesignTokens.textPrimary)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 12)], spacing: 12) {
                    ForEach(roles, id: \.self) { role in
                        roleButton(role)
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("What skills are needed?")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    TagEditorSection(tags: $skillsNeeded)
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
    }

    private func roleButton(_ role: String) -> some View {
        let isSelected = selectedRoles.contains(role)

        return Button {
            withAnimation(.easeOut(duration: 0.18)) {
                if isSelected {
                    selectedRoles.removeAll { $0 == role }
                } else {
                    selectedRoles.append(role)
                }
            }
        } label: {
            Text(role)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(isSelected ? .white : DesignTokens.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(isSelected ? indigo : DesignTokens.cardFill)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(isSelected ? indigo : DesignTokens.separator, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private var stageStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Where are you at?")
                .font(.spaceGrotesk(32, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)

            Text("Pick the stage that feels closest right now")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(DesignTokens.textSecondary)

            VStack(spacing: 14) {
                stageCard(
                    stage: .idea,
                    emoji: "💭",
                    title: "Just an idea",
                    subtitle: "still exploring"
                )
                stageCard(
                    stage: .building,
                    emoji: "🔨",
                    title: "Building",
                    subtitle: "already started"
                )
                stageCard(
                    stage: .launched,
                    emoji: "🚀",
                    title: "Launched",
                    subtitle: "it's live"
                )
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 20)
    }

    private func stageCard(stage candidate: Idea.Stage, emoji: String, title: String, subtitle: String) -> some View {
        let isSelected = stage == candidate

        return Button {
            withAnimation(.easeOut(duration: 0.18)) {
                stage = candidate
            }
        } label: {
            HStack(spacing: 16) {
                Text(emoji)
                    .font(.system(size: 30))
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.spaceGrotesk(22, weight: .bold))
                        .foregroundStyle(DesignTokens.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(DesignTokens.textSecondary)
                }
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(isSelected ? indigo : DesignTokens.textTertiary)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(isSelected ? indigo.opacity(0.14) : DesignTokens.cardFill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(isSelected ? indigo : DesignTokens.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var footerButton: some View {
        Button {
            if step < 2 {
                moveForward()
            } else {
                Task { await submitIdea() }
            }
        } label: {
            Group {
                if isPosting {
                    ProgressView().tint(.white)
                } else {
                    Text(step < 2 ? "Next" : "Post")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(indigo)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .opacity(canAdvance && !isPosting ? 1 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!canAdvance || isPosting)
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 18)
        .background(DesignTokens.background)
    }

    private var stepTitle: String {
        switch step {
        case 0: "Step 1 of 3"
        case 1: "Step 2 of 3"
        default: "Step 3 of 3"
        }
    }

    private func moveForward() {
        guard step < 2 else { return }
        transitionEdge = .trailing
        withAnimation(.spring(response: 0.32, dampingFraction: 0.9)) {
            step += 1
        }
    }

    private func moveBackward() {
        guard step > 0 else { return }
        transitionEdge = .leading
        withAnimation(.spring(response: 0.32, dampingFraction: 0.9)) {
            step -= 1
        }
    }

    private func submitIdea() async {
        let trimmedIdea = ideaText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedIdea.isEmpty else { return }

        isPosting = true
        errorMessage = nil
        defer { isPosting = false }

        do {
            let client = SupabaseService.shared.client
            let userId = try await client.auth.session.user.id

            try await client.from("ideas").insert(IdeaComposerInsert(
                authorId: userId,
                title: derivedTitle(from: trimmedIdea),
                description: trimmedIdea,
                skillsNeeded: skillsNeeded,
                rolesNeeded: selectedRoles,
                stage: stage
            )).execute()

            NotificationCenter.default.post(name: .schubContentCreated, object: nil)
            onDismiss()
        } catch {
            errorMessage = error.localizedDescription
            if step != 0 {
                transitionEdge = .leading
                withAnimation(.spring(response: 0.32, dampingFraction: 0.9)) {
                    step = 0
                }
            }
        }
    }

    private func derivedTitle(from text: String) -> String {
        let compact = text
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard compact.count > 72 else { return compact }
        return String(compact.prefix(69)).trimmingCharacters(in: .whitespaces) + "..."
    }
}

private struct IdeaComposerInsert: Encodable {
    let authorId: UUID
    let title: String
    let description: String
    let skillsNeeded: [String]
    let rolesNeeded: [String]
    let stage: Idea.Stage

    enum CodingKeys: String, CodingKey {
        case title, description, stage
        case authorId = "author_id"
        case skillsNeeded = "skills_needed"
        case rolesNeeded = "roles_needed"
    }
}

#Preview {
    PostComposerSheet { _ in }
        .background(DesignTokens.background)
        .preferredColorScheme(.dark)
}
