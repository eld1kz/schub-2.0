import SwiftUI
import Supabase
import Auth

struct ApplySheet: View {
    let idea: Idea
    var onApplied: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @State private var selectedRole = ""
    @State private var message = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let green = Color(hex: "#16A34A")

    private var roleOptions: [String] {
        idea.rolesNeeded.isEmpty
            ? ["iOS Dev", "Backend Dev", "Designer", "Marketer", "CTO", "Data Scientist"]
            : idea.rolesNeeded
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Role you're applying for") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(roleOptions, id: \.self) { role in
                                Button {
                                    selectedRole = role
                                } label: {
                                    Text(role)
                                        .font(.subheadline.bold())
                                        .foregroundStyle(selectedRole == role ? .white : green)
                                        .padding(.horizontal, 14).padding(.vertical, 8)
                                        .background(selectedRole == role ? green : green.opacity(0.1))
                                        .clipShape(.capsule)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                }

                Section("Message (optional)") {
                    TextField("Why are you a great fit?", text: $message, axis: .vertical)
                        .lineLimit(4, reservesSpace: true)
                }

                if let err = errorMessage {
                    Section {
                        Text(err).font(.caption).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Apply to join")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        Task { await submit() }
                    }
                    .disabled(selectedRole.isEmpty || isLoading)
                    .overlay {
                        if isLoading { ProgressView().scaleEffect(0.7) }
                    }
                }
            }
        }
    }

    private func submit() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await ApplicationService().apply(ideaId: idea.id, role: selectedRole, message: message)
            if let userId = try? await SupabaseService.shared.client.auth.session.user.id {
                await NotificationService().insert(
                    recipientId: idea.authorId,
                    senderId: userId,
                    type: .applied,
                    ideaId: idea.id,
                    message: selectedRole
                )
            }
            onApplied()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ApplySheet(idea: Idea(
        id: UUID(), authorId: UUID(),
        title: "AI Study Buddy",
        description: "A personalized tutor",
        skillsNeeded: ["Swift"],
        rolesNeeded: ["iOS Dev", "Backend Dev", "Designer"],
        stage: .idea,
        createdAt: Date(),
        likesCount: 0
    ))
}

