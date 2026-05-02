import SwiftUI

struct EditProfileView: View {
    let viewModel: ProfileViewModel
    @State private var draft: UserProfile
    @Environment(\.dismiss) private var dismiss

    private let years = Array((Calendar.current.component(.year, from: Date()) - 4)...(Calendar.current.component(.year, from: Date()) + 6))

    init(viewModel: ProfileViewModel, profile: UserProfile) {
        self.viewModel = viewModel
        self._draft = State(initialValue: profile)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Full Name", text: $draft.name)
                    TextField("University", text: $draft.university)
                    Picker("Graduation Year", selection: $draft.graduationYear) {
                        Text("Not set").tag(0)
                        ForEach(years, id: \.self) { Text(String($0)).tag($0) }
                    }
                }

                Section("Bio") {
                    TextField("Tell others about yourself…", text: $draft.bio, axis: .vertical)
                        .lineLimit(4, reservesSpace: true)
                }

                Section {
                    TagEditorSection(title: "Skills", tags: $draft.skills)
                }

                Section {
                    TagEditorSection(title: "Interests", tags: $draft.interests)
                }

                Section("Settings") {
                    Toggle("Open to Collaborate", isOn: $draft.openToCollaborate)
                }

                Section("Avatar") {
                    TextField("Image URL", text: $draft.avatarURL)
                        .textContentType(.URL)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await viewModel.updateProfile(draft); dismiss() }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
        }
    }
}

#Preview {
    EditProfileView(
        viewModel: ProfileViewModel(),
        profile: UserProfile(
            id: UUID(),
            name: "Eldar",
            university: "MIT",
            graduationYear: 2026,
            bio: "iOS developer",
            skills: ["Swift", "SwiftUI"],
            interests: ["Music", "Travel"],
            openToCollaborate: true,
            avatarURL: ""
        )
    )
}
