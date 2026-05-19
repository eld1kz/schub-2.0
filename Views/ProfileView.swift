import SwiftUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var viewModel = ProfileViewModel()
    @State private var showEdit = false

    var body: some View {
        NavigationStack {
            ZStack {
                PC.bg.ignoresSafeArea()
                contentBody
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(PC.bg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign Out") { Task { await authViewModel.signOut() } }
                        .font(.inter(13))
                        .foregroundStyle(PC.p3)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showEdit = true } label: {
                        Text("Edit")
                            .font(.custom("SpaceGrotesk-Medium", size: 12))
                            .foregroundStyle(PC.p2)
                            .padding(.horizontal, 14).padding(.vertical, 6)
                            .background(PC.card)
                            .overlay(Capsule().stroke(PC.sep2, lineWidth: 1))
                            .clipShape(Capsule())
                    }
                    .disabled(viewModel.profile == nil)
                }
            }
            .sheet(isPresented: $showEdit) {
                if let p = viewModel.profile {
                    EditProfileView(viewModel: viewModel, profile: p)
                }
            }
            .task { await viewModel.loadProfile() }
            .refreshable { await viewModel.loadProfile() }
        }
    }

    @ViewBuilder
    private var contentBody: some View {
        if viewModel.isLoading && viewModel.profile == nil {
            ProgressView().tint(PC.p3)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let profile = viewModel.profile {
            profileScroll(profile)
        } else {
            errorState
        }
    }

    // MARK: - Scroll

    private func profileScroll(_ profile: UserProfile) -> some View {
        ScrollView {
            VStack(spacing: 10) {
                heroCard(profile)
                if !profile.bio.isEmpty {
                    aboutCard(profile.bio)
                }
                if !profile.experiences.isEmpty {
                    experienceCard(profile.experiences)
                }
                let hasStructuredEdu = !profile.education.isEmpty
                let hasLegacyEdu = !profile.university.isEmpty || profile.graduationYear > 0
                if hasStructuredEdu {
                    educationCard(profile.education)
                } else if hasLegacyEdu {
                    legacyEducationCard(profile)
                }
                if !profile.skills.isEmpty {
                    pillCard("Stack", tags: profile.skills, accent: true)
                }
                if !profile.lookingFor.isEmpty || !profile.availability.isEmpty {
                    openToCard(profile)
                }
                if !profile.interests.isEmpty {
                    pillCard("Interests", tags: profile.interests, accent: false)
                }
                Color.clear.frame(height: 16)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }
    }

    // MARK: - Hero Card

    private func heroCard(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                monoAvatar(name: profile.name, url: profile.avatarURL, size: 72)

                VStack(alignment: .leading, spacing: 3) {
                    Text(profile.name.isEmpty ? "Your Name" : profile.name)
                        .font(.custom("SpaceGrotesk-Bold", size: 20))
                        .foregroundStyle(PC.p1)
                        .kerning(-0.4)

                    if !profile.university.isEmpty {
                        Text(profile.university)
                            .font(.inter(13))
                            .foregroundStyle(PC.p2)
                    }
                    if profile.graduationYear > 0 {
                        Text("Class of \(profile.graduationYear)")
                            .font(.inter(12))
                            .foregroundStyle(PC.p3)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(16)

            if profile.openToCollaborate || !profile.availability.isEmpty {
                Rectangle().fill(PC.sep).frame(height: 1)
                HStack(spacing: 8) {
                    if profile.openToCollaborate {
                        HStack(spacing: 5) {
                            PulseDot(color: PC.green, diameter: 6)
                            Text("Open to build")
                                .font(.inter(12, weight: .medium))
                                .foregroundStyle(PC.green)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(PC.greenDim)
                        .clipShape(Capsule())
                    }
                    if !profile.availability.isEmpty {
                        Text(profile.availability)
                            .font(.inter(12))
                            .foregroundStyle(PC.p3)
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(PC.sep)
                            .clipShape(Capsule())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - About Card

    private func aboutCard(_ bio: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            cardHeader("About")
            Text(bio)
                .font(.inter(14))
                .foregroundStyle(PC.p2)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Experience Card

    private func experienceCard(_ experiences: [ProfileExperience]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            cardHeader("Experience").padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 12)
            ForEach(Array(experiences.enumerated()), id: \.element.id) { i, exp in
                if i > 0 {
                    Rectangle().fill(PC.sep).frame(height: 1).padding(.leading, 62)
                }
                HStack(alignment: .top, spacing: 12) {
                    entityIcon(String(exp.company.prefix(1)))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(exp.role)
                            .font(.custom("SpaceGrotesk-SemiBold", size: 14))
                            .foregroundStyle(PC.p1)
                        Text(exp.company)
                            .font(.inter(13))
                            .foregroundStyle(PC.p2)
                        Text(exp.dateRangeString)
                            .font(.inter(12))
                            .foregroundStyle(PC.p3)
                        if !exp.location.isEmpty {
                            Text(exp.location)
                                .font(.inter(12))
                                .foregroundStyle(PC.p3)
                        }
                        if !exp.description.isEmpty {
                            Text(exp.description)
                                .font(.inter(13))
                                .foregroundStyle(PC.p2)
                                .lineSpacing(3)
                                .padding(.top, 4)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Education Cards

    private func educationCard(_ education: [ProfileEducation]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            cardHeader("Education").padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 12)
            ForEach(Array(education.enumerated()), id: \.element.id) { i, edu in
                if i > 0 {
                    Rectangle().fill(PC.sep).frame(height: 1).padding(.leading, 62)
                }
                HStack(alignment: .top, spacing: 12) {
                    entityIcon(String(edu.school.prefix(1)))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(edu.school)
                            .font(.custom("SpaceGrotesk-SemiBold", size: 14))
                            .foregroundStyle(PC.p1)
                        if !edu.subtitleLine.isEmpty {
                            Text(edu.subtitleLine)
                                .font(.inter(13))
                                .foregroundStyle(PC.p2)
                        }
                        Text(edu.dateRangeString)
                            .font(.inter(12))
                            .foregroundStyle(PC.p3)
                        if !edu.gpa.isEmpty {
                            Text("GPA: \(edu.gpa)")
                                .font(.inter(12))
                                .foregroundStyle(PC.p3)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func legacyEducationCard(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            cardHeader("Education").padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 12)
            HStack(alignment: .top, spacing: 12) {
                entityIcon((profile.university.first.map(String.init) ?? "U").uppercased())
                VStack(alignment: .leading, spacing: 2) {
                    if !profile.university.isEmpty {
                        Text(profile.university)
                            .font(.custom("SpaceGrotesk-SemiBold", size: 14))
                            .foregroundStyle(PC.p1)
                    }
                    if profile.graduationYear > 0 {
                        Text("Class of \(profile.graduationYear)")
                            .font(.inter(13))
                            .foregroundStyle(PC.p2)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Pill Card (Stack / Interests)

    private func pillCard(_ title: String, tags: [String], accent: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            cardHeader(title)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 68), spacing: 6)],
                      alignment: .leading, spacing: 6) {
                ForEach(tags, id: \.self) { tag in
                    Text(tag)
                        .font(.inter(12, weight: accent ? .medium : .regular))
                        .foregroundStyle(accent ? PC.accentPillText : PC.p2)
                        .padding(.horizontal, 11).padding(.vertical, 5)
                        .background(accent ? PC.accentPillBg : PC.field)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Open To Card (Looking For + Availability)

    private func openToCard(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            cardHeader("Open To")
            if !profile.lookingFor.isEmpty {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 6)],
                          alignment: .leading, spacing: 6) {
                    ForEach(profile.lookingFor, id: \.self) { tag in
                        Text(tag)
                            .font(.inter(12))
                            .foregroundStyle(PC.p2)
                            .padding(.horizontal, 11).padding(.vertical, 5)
                            .background(PC.field)
                            .clipShape(Capsule())
                    }
                }
            }
            if !profile.availability.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 11))
                        .foregroundStyle(PC.p3)
                    Text(profile.availability)
                        .font(.inter(13))
                        .foregroundStyle(PC.p2)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PC.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Shared helpers

    private func cardHeader(_ title: String) -> some View {
        Text(title)
            .font(.custom("SpaceGrotesk-SemiBold", size: 16))
            .foregroundStyle(PC.p1)
    }

    private func entityIcon(_ letter: String) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(PC.field)
                .frame(width: 38, height: 38)
                .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke(PC.sep2, lineWidth: 1))
            Text(letter.uppercased())
                .font(.custom("SpaceGrotesk-SemiBold", size: 14))
                .foregroundStyle(PC.p2)
        }
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

    private var errorState: some View {
        VStack(spacing: 14) {
            Text("Couldn't load your profile")
                .font(.custom("SpaceGrotesk-Bold", size: 17))
                .foregroundStyle(PC.p1)
            Button("Try again") { Task { await viewModel.loadProfile() } }
                .font(.inter(14, weight: .semibold))
                .foregroundStyle(PC.accentPillText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Pulse Dot

struct PulseDot: View {
    let color: Color
    let diameter: CGFloat
    @State private var faded = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: diameter, height: diameter)
            .opacity(faded ? 0.4 : 1.0)
            .onAppear {
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    faded = true
                }
            }
    }
}

#Preview {
    ProfileView()
        .environment(AuthViewModel())
}
