import SwiftUI
import PhotosUI

struct EditProfileView: View {
    let viewModel: ProfileViewModel
    @State private var draft: UserProfile
    @State private var pickerItem: PhotosPickerItem?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var newSkill = ""
    @State private var newInterest = ""

    @State private var experienceDraft = ProfileExperience()
    @State private var editingExperienceIdx: Int? = nil
    @State private var showExperienceSheet = false

    @State private var educationDraft = ProfileEducation()
    @State private var editingEducationIdx: Int? = nil
    @State private var showEducationSheet = false

    @Environment(\.dismiss) private var dismiss

    private let years: [Int] = {
        let y = Calendar.current.component(.year, from: Date())
        return Array((y - 4)...(y + 6))
    }()

    private let lookingForOptions = [
        "Co-founder", "Technical partner", "Designer",
        "Marketing", "Advisor", "Investor", "Collaborator"
    ]
    private let availabilityOptions = [
        "Full-time", "Part-time", "Weekends", "Not available"
    ]

    init(viewModel: ProfileViewModel, profile: UserProfile) {
        self.viewModel = viewModel
        self._draft = State(initialValue: profile)
    }

    var body: some View {
        VStack(spacing: 0) {
            stickyHeader
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    avatarBlock
                    fieldsBlock
                    experienceBlock
                    educationBlock
                    stackBlock
                    interestsBlock
                    linksBlock
                    lookingForBlock
                    availabilityBlock
                    collabToggle
                    saveButton
                    Color.clear.frame(height: 40)
                }
            }
        }
        .background(PC.bg.ignoresSafeArea())
        .presentationBackground(PC.bg)
        .onChange(of: viewModel.errorMessage) { _, newValue in
            if newValue != nil { errorMessage = "Couldn't save. Try again." }
        }
        .onChange(of: pickerItem) { _, item in
            Task {
                guard let item else { return }
                guard let data = try? await item.loadTransferable(type: Data.self) else { return }
                await viewModel.uploadAvatar(data: data)
                if let url = viewModel.profile?.avatarURL {
                    draft.avatarURL = url
                }
            }
        }
        .sheet(isPresented: $showExperienceSheet) {
            ExperienceEditSheet(
                experience: $experienceDraft,
                isNew: editingExperienceIdx == nil,
                onSave: {
                    if let idx = editingExperienceIdx {
                        draft.experiences[idx] = experienceDraft
                    } else {
                        draft.experiences.append(experienceDraft)
                    }
                },
                onRemove: editingExperienceIdx == nil ? nil : {
                    if let idx = editingExperienceIdx {
                        draft.experiences.remove(at: idx)
                    }
                }
            )
        }
        .sheet(isPresented: $showEducationSheet) {
            EducationEditSheet(
                education: $educationDraft,
                isNew: editingEducationIdx == nil,
                onSave: {
                    if let idx = editingEducationIdx {
                        draft.education[idx] = educationDraft
                    } else {
                        draft.education.append(educationDraft)
                    }
                },
                onRemove: editingEducationIdx == nil ? nil : {
                    if let idx = editingEducationIdx {
                        draft.education.remove(at: idx)
                    }
                }
            )
        }
    }

    // MARK: - Header

    private var stickyHeader: some View {
        HStack {
            Button("Cancel") { dismiss() }
                .font(.inter(13))
                .foregroundStyle(PC.p3)

            Spacer()

            Text("Edit Profile")
                .font(.custom("SpaceGrotesk-SemiBold", size: 14))
                .foregroundStyle(PC.p1)
                .kerning(-0.01)

            Spacer()

            Button {
                Task { await saveProfile() }
            } label: {
                Group {
                    if isSaving {
                        Text("Saving…").foregroundStyle(PC.p3)
                    } else {
                        Text("Save").foregroundStyle(Color(hex: "#0c0c0d"))
                    }
                }
                .font(.custom("SpaceGrotesk-Bold", size: 12))
                .padding(.horizontal, 16).padding(.vertical, 6)
                .background(isSaving ? PC.field : PC.accentDot)
                .clipShape(Capsule())
            }
            .disabled(isSaving)
        }
        .padding(.horizontal, 18)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(PC.bg.opacity(0.92))
        .overlay(alignment: .bottom) {
            Rectangle().fill(PC.sep).frame(height: 1)
        }
    }

    // MARK: - Avatar

    private var avatarBlock: some View {
        VStack(spacing: 8) {
            PhotosPicker(selection: $pickerItem, matching: .images,
                         preferredItemEncoding: .compatible, photoLibrary: .shared()) {
                ZStack(alignment: .bottomTrailing) {
                    monoAvatar(name: draft.name, url: draft.avatarURL, size: 72)
                    Circle()
                        .fill(Color(hex: "#1e1e22"))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Image(systemName: "camera.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(PC.p2)
                        )
                        .overlay(Circle().stroke(PC.sep2.opacity(0.5), lineWidth: 1.5))
                        .offset(x: 1, y: 1)
                }
            }
            Text("Change photo")
                .font(.inter(11))
                .foregroundStyle(PC.p3)
            if let errorMessage {
                Text(errorMessage)
                    .font(.inter(12))
                    .foregroundStyle(DesignTokens.error)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 20)
        .padding(.bottom, 24)
    }

    // MARK: - Basic Fields

    private var fieldsBlock: some View {
        VStack(spacing: 10) {
            floatField("Name", text: $draft.name)
            floatField("University", text: $draft.university)
            floatField("Bio", text: $draft.bio, multiline: true)
            gradYearField
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    private func floatField(_ label: String, text: Binding<String>,
                            multiline: Bool = false, keyboardType: UIKeyboardType = .default) -> some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PC.field)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.inter(11))
                    .foregroundStyle(PC.p3)
                    .padding(.horizontal, 14)
                    .padding(.top, 10)
                if multiline {
                    TextField("", text: text, axis: .vertical)
                        .lineLimit(3...6)
                        .font(.inter(14))
                        .foregroundStyle(PC.p1)
                        .padding(.horizontal, 14)
                        .padding(.top, 2)
                        .padding(.bottom, 10)
                } else {
                    TextField("", text: text)
                        .font(.inter(14))
                        .foregroundStyle(PC.p1)
                        .keyboardType(keyboardType)
                        .padding(.horizontal, 14)
                        .padding(.top, 2)
                        .padding(.bottom, 10)
                }
            }
        }
    }

    private var gradYearField: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PC.field)
            VStack(alignment: .leading, spacing: 0) {
                Text("Graduation Year")
                    .font(.inter(11))
                    .foregroundStyle(PC.p3)
                    .padding(.horizontal, 14)
                    .padding(.top, 10)
                Picker("", selection: $draft.graduationYear) {
                    Text("Not set").tag(0)
                    ForEach(years, id: \.self) { Text(String($0)).tag($0) }
                }
                .pickerStyle(.menu)
                .tint(PC.p1)
                .padding(.horizontal, 6)
                .padding(.bottom, 2)
            }
        }
    }

    // MARK: - Experience

    private var experienceBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Experience")
            if !draft.experiences.isEmpty {
                VStack(spacing: 8) {
                    ForEach(Array(draft.experiences.enumerated()), id: \.offset) { i, exp in
                        experienceRow(exp, index: i)
                    }
                }
            }
            addRowButton("Add experience") {
                experienceDraft = ProfileExperience()
                editingExperienceIdx = nil
                showExperienceSheet = true
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    private func experienceRow(_ exp: ProfileExperience, index: Int) -> some View {
        Button {
            experienceDraft = exp
            editingExperienceIdx = index
            showExperienceSheet = true
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exp.role.isEmpty ? "Untitled Role" : exp.role)
                        .font(.custom("SpaceGrotesk-SemiBold", size: 13))
                        .foregroundStyle(PC.p1)
                        .lineLimit(1)
                    Text(exp.company.isEmpty ? "—" : exp.company)
                        .font(.inter(12))
                        .foregroundStyle(PC.p2)
                        .lineLimit(1)
                    Text(exp.dateRangeString)
                        .font(.inter(11))
                        .foregroundStyle(PC.p3)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(PC.p3)
            }
            .padding(14)
            .background(PC.field)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    // MARK: - Education

    private var educationBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Education")
            if !draft.education.isEmpty {
                VStack(spacing: 8) {
                    ForEach(Array(draft.education.enumerated()), id: \.offset) { i, edu in
                        educationRow(edu, index: i)
                    }
                }
            }
            addRowButton("Add education") {
                educationDraft = ProfileEducation()
                editingEducationIdx = nil
                showEducationSheet = true
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    private func educationRow(_ edu: ProfileEducation, index: Int) -> some View {
        Button {
            educationDraft = edu
            editingEducationIdx = index
            showEducationSheet = true
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(edu.school.isEmpty ? "Untitled School" : edu.school)
                        .font(.custom("SpaceGrotesk-SemiBold", size: 13))
                        .foregroundStyle(PC.p1)
                        .lineLimit(1)
                    if !edu.subtitleLine.isEmpty {
                        Text(edu.subtitleLine)
                            .font(.inter(12))
                            .foregroundStyle(PC.p2)
                            .lineLimit(1)
                    }
                    Text(edu.dateRangeString)
                        .font(.inter(11))
                        .foregroundStyle(PC.p3)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(PC.p3)
            }
            .padding(14)
            .background(PC.field)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    // MARK: - Stack (Skills)

    private var stackBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Stack")
            if !draft.skills.isEmpty {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 6)],
                          alignment: .leading, spacing: 6) {
                    ForEach(Array(draft.skills.enumerated()), id: \.offset) { i, skill in
                        editablePill(skill, accentStyle: true) {
                            draft.skills.remove(at: i)
                        }
                    }
                }
            }
            tagInputRow(text: $newSkill, placeholder: "Add a skill…", accentColor: PC.accentPillText) {
                addTag(to: &draft.skills, from: &newSkill)
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Interests

    private var interestsBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Interests")
            if !draft.interests.isEmpty {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 6)],
                          alignment: .leading, spacing: 6) {
                    ForEach(Array(draft.interests.enumerated()), id: \.offset) { i, interest in
                        editablePill(interest, accentStyle: false) {
                            draft.interests.remove(at: i)
                        }
                    }
                }
            }
            tagInputRow(text: $newInterest, placeholder: "Add an interest…", accentColor: PC.p2) {
                addTag(to: &draft.interests, from: &newInterest)
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Links

    private var linksBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Links")
            VStack(spacing: 10) {
                floatField("GitHub", text: $draft.links.github, keyboardType: .URL)
                floatField("LinkedIn", text: $draft.links.linkedin, keyboardType: .URL)
                floatField("Twitter / X", text: $draft.links.twitter, keyboardType: .URL)
                floatField("Website", text: $draft.links.website, keyboardType: .URL)
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Looking For

    private var lookingForBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Looking For")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 6)],
                      alignment: .leading, spacing: 6) {
                ForEach(lookingForOptions, id: \.self) { option in
                    let selected = draft.lookingFor.contains(option)
                    Button {
                        if selected {
                            draft.lookingFor.removeAll { $0 == option }
                        } else {
                            draft.lookingFor.append(option)
                        }
                    } label: {
                        Text(option)
                            .font(.inter(12, weight: selected ? .medium : .regular))
                            .foregroundStyle(selected ? PC.accentPillText : PC.p2)
                            .padding(.horizontal, 12).padding(.vertical, 5)
                            .background(selected ? PC.accentPillBg : PC.field)
                            .overlay(
                                Group {
                                    if !selected {
                                        Capsule().stroke(PC.sep2, lineWidth: 1)
                                    }
                                }
                            )
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Availability

    private var availabilityBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            editEyebrow("Availability")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 6)],
                      alignment: .leading, spacing: 6) {
                ForEach(availabilityOptions, id: \.self) { option in
                    let selected = draft.availability == option
                    Button {
                        draft.availability = selected ? "" : option
                    } label: {
                        Text(option)
                            .font(.inter(12, weight: selected ? .medium : .regular))
                            .foregroundStyle(selected ? PC.accentPillText : PC.p2)
                            .padding(.horizontal, 12).padding(.vertical, 5)
                            .background(selected ? PC.accentPillBg : PC.field)
                            .overlay(
                                Group {
                                    if !selected {
                                        Capsule().stroke(PC.sep2, lineWidth: 1)
                                    }
                                }
                            )
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Collab toggle

    private var collabToggle: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Open to collaborate")
                    .font(.custom("SpaceGrotesk-Medium", size: 14))
                    .foregroundStyle(PC.p1)
                Text("Show on your profile")
                    .font(.inter(12))
                    .foregroundStyle(PC.p3)
            }
            Spacer()
            Toggle("", isOn: $draft.openToCollaborate)
                .labelsHidden()
                .tint(PC.green)
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 20)
    }

    // MARK: - Save button

    private var saveButton: some View {
        Button {
            Task { await saveProfile() }
        } label: {
            Group {
                if isSaving {
                    ProgressView().tint(PC.p3)
                } else {
                    Text("Save Profile")
                        .font(.custom("SpaceGrotesk-Bold", size: 14))
                        .foregroundStyle(Color(hex: "#0e0e10"))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(isSaving ? PC.field : PC.p1)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(isSaving)
        .padding(.horizontal, 18)
        .padding(.bottom, 4)
    }

    // MARK: - Helpers

    private func editEyebrow(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.custom("SpaceGrotesk-SemiBold", size: 11))
            .foregroundStyle(PC.p3)
            .kerning(0.88)
    }

    private func addRowButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .semibold))
                Text(label)
                    .font(.inter(13))
            }
            .foregroundStyle(PC.p2)
            .frame(maxWidth: .infinity)
            .frame(height: 42)
            .background(PC.field)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(PC.sep2.opacity(0.6), lineWidth: 1))
        }
    }

    private func editablePill(_ label: String, accentStyle: Bool, onDelete: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.inter(12, weight: .medium))
                .foregroundStyle(accentStyle ? PC.accentPillText : PC.p2)
            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(accentStyle ? PC.accentPillText.opacity(0.6) : PC.p2.opacity(0.5))
            }
        }
        .padding(.leading, 12).padding(.trailing, 8).padding(.vertical, 5)
        .background(accentStyle ? PC.accentPillBg : PC.card)
        .overlay(
            Group {
                if !accentStyle { Capsule().stroke(PC.sep2, lineWidth: 1) }
            }
        )
        .clipShape(Capsule())
    }

    private func tagInputRow(
        text: Binding<String>,
        placeholder: String,
        accentColor: Color,
        onAdd: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 8) {
            TextField(placeholder, text: text)
                .font(.inter(13))
                .foregroundStyle(PC.p1)
                .autocorrectionDisabled()
                .onSubmit { onAdd() }
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(PC.field)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            Button(action: onAdd) {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(accentColor)
                    .frame(width: 36, height: 36)
                    .background(PC.field)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
    }

    private func addTag(to list: inout [String], from input: inout String) {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !list.contains(trimmed) else { input = ""; return }
        withAnimation(.easeOut(duration: 0.18)) { list.append(trimmed) }
        input = ""
    }

    private func monoAvatar(name: String, url: String, size: CGFloat) -> some View {
        Group {
            if !url.isEmpty, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        monoGradientFill(name: name, size: size)
                    }
                }
            } else {
                monoGradientFill(name: name, size: size)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(PC.sep2, lineWidth: 1))
    }

    private func monoGradientFill(name: String, size: CGFloat) -> some View {
        let initials = name.split(separator: " ").compactMap(\.first)
            .prefix(2).map(String.init).joined().uppercased()
        return ZStack {
            LinearGradient(
                colors: [Color(hex: "#2a2a2e"), Color(hex: "#161618")],
                startPoint: .init(x: 0.15, y: 0.15),
                endPoint: .init(x: 0.85, y: 0.85)
            )
            Text(initials.isEmpty ? "?" : initials)
                .font(.custom("SpaceGrotesk-Bold", size: size * 0.32))
                .foregroundStyle(Color.white.opacity(0.92))
        }
    }

    private func saveProfile() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        await viewModel.updateProfile(draft)
        if viewModel.errorMessage == nil {
            dismiss()
        } else {
            errorMessage = "Couldn't save. Try again."
        }
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
            skills: ["Swift", "SwiftUI", "Supabase"],
            interests: ["Startups", "Music", "Design"],
            openToCollaborate: true,
            avatarURL: ""
        )
    )
}
