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
        VStack(spacing: 0) {
            editHeader
            ScrollView {
                VStack(spacing: 20) {
                    avatarSection
                    fieldsSection
                    tagsSection
                    toggleSection
                    saveButton
                }
                .padding(.bottom, 40)
            }
        }
        .background(DesignTokens.background.ignoresSafeArea())
        .presentationBackground(DesignTokens.background)
    }

    // MARK: Header

    private var editHeader: some View {
        HStack {
            Button("Cancel") { dismiss() }
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
            Spacer()
            Text("Edit Profile")
                .font(.spaceGrotesk(16, weight: .semibold))
                .foregroundStyle(DesignTokens.textPrimary)
            Spacer()
            Button {
                Task { await viewModel.updateProfile(draft); dismiss() }
            } label: {
                Group {
                    if viewModel.isLoading {
                        ProgressView().tint(.black).scaleEffect(0.8)
                    } else {
                        Text("Save")
                            .font(.subheadline.bold())
                            .foregroundStyle(.black)
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 7)
                .background(DesignTokens.accentText)
                .clipShape(.capsule)
            }
            .disabled(viewModel.isLoading)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(DesignTokens.background)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.separator).frame(height: 1)
        }
    }

    // MARK: Avatar

    private var avatarSection: some View {
        ZStack(alignment: .bottomTrailing) {
            Circle()
                .fill(LinearGradient(
                    colors: [Color(hex: "#6c5ce7"), Color(hex: "#a855f7")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                .frame(width: 76, height: 76)
                .overlay(
                    Text(draft.name.first.map(String.init) ?? "?")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(.white)
                )
            Circle()
                .fill(Color(hex: "#1e1e22"))
                .frame(width: 24, height: 24)
                .overlay(
                    Image(systemName: "pencil")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(DesignTokens.textSecondary)
                )
                .offset(x: 2, y: 2)
        }
        .padding(.top, 20)
    }

    // MARK: Fields

    private var fieldsSection: some View {
        VStack(spacing: 12) {
            floatingField("Name", text: $draft.name)
            floatingField("University", text: $draft.university)
            floatingField("Bio", text: $draft.bio, multiline: true)
            gradYearField
        }
        .padding(.horizontal, 20)
    }

    @ViewBuilder
    private func floatingField(_ label: String, text: Binding<String>, multiline: Bool = false) -> some View {
        ZStack(alignment: .topLeading) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(DesignTokens.textTertiary)
                .padding(.top, 10)
                .padding(.leading, 14)
            if multiline {
                TextField("", text: text, axis: .vertical)
                    .lineLimit(3...6)
                    .font(.body)
                    .foregroundStyle(DesignTokens.textPrimary)
                    .padding(.top, 28).padding(.horizontal, 14).padding(.bottom, 12)
            } else {
                TextField("", text: text)
                    .font(.body)
                    .foregroundStyle(DesignTokens.textPrimary)
                    .padding(.top, 28).padding(.horizontal, 14).padding(.bottom, 12)
            }
        }
        .frame(maxWidth: .infinity)
        .background(DesignTokens.fieldFill)
        .clipShape(.rect(cornerRadius: 12))
    }

    private var gradYearField: some View {
        ZStack(alignment: .topLeading) {
            Text("Graduation Year")
                .font(.caption2)
                .foregroundStyle(DesignTokens.textTertiary)
                .padding(.top, 10).padding(.leading, 14)
            Picker("", selection: $draft.graduationYear) {
                Text("Not set").tag(0).foregroundStyle(DesignTokens.textPrimary)
                ForEach(years, id: \.self) { Text(String($0)).tag($0) }
            }
            .pickerStyle(.menu)
            .accentColor(DesignTokens.accentText)
            .padding(.top, 22).padding(.leading, 6).padding(.bottom, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.fieldFill)
        .clipShape(.rect(cornerRadius: 12))
    }

    // MARK: Tags

    private var tagsSection: some View {
        VStack(spacing: 16) {
            tagGroup("SKILLS", tags: $draft.skills)
            tagGroup("INTERESTS", tags: $draft.interests)
        }
        .padding(.horizontal, 20)
    }

    private func tagGroup(_ label: String, tags: Binding<[String]>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(DesignTokens.textTertiary)
                .tracking(0.8)
            TagEditorSection(tags: tags)
                .padding(.horizontal, -20)
        }
    }

    // MARK: Toggle

    private var toggleSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Open to Collaborate")
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.textPrimary)
                Text("Let others know you're available")
                    .font(.caption)
                    .foregroundStyle(DesignTokens.textTertiary)
            }
            Spacer()
            Toggle("", isOn: $draft.openToCollaborate)
                .labelsHidden()
                .tint(DesignTokens.collabGreen)
        }
        .padding(16)
        .background(DesignTokens.fieldFill)
        .clipShape(.rect(cornerRadius: 12))
        .padding(.horizontal, 20)
    }

    // MARK: Save

    private var saveButton: some View {
        Button {
            Task { await viewModel.updateProfile(draft); dismiss() }
        } label: {
            Group {
                if viewModel.isLoading {
                    ProgressView().tint(DesignTokens.background)
                } else {
                    Text("Save Profile").font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(.white)
            .foregroundStyle(DesignTokens.background)
            .clipShape(.rect(cornerRadius: 14))
        }
        .disabled(viewModel.isLoading)
        .padding(.horizontal, 20)
    }
}

#Preview {
    EditProfileView(
        viewModel: ProfileViewModel(),
        profile: UserProfile(
            id: UUID(),
            name: "Eldar Ugay",
            university: "MIT",
            graduationYear: 2026,
            bio: "Building things at the intersection of AI and mobile.",
            skills: ["Swift", "SwiftUI"],
            interests: ["Music", "AI"],
            openToCollaborate: true,
            avatarURL: ""
        )
    )
}
