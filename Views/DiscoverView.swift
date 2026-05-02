import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterBar
                Divider()
                profileList
            }
            .navigationTitle("Discover")
            .navigationDestination(for: UserProfile.self) { profile in
                ProfileDetailView(profile: profile)
            }
            .task { await viewModel.loadProfiles() }
        }
    }

    private var filterBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("University", selection: $viewModel.selectedUniversity) {
                Text("All Universities").tag("")
                ForEach(viewModel.availableUniversities, id: \.self) { uni in
                    Text(uni).tag(uni)
                }
            }
            .pickerStyle(.menu)

            if !viewModel.availableSkills.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        filterChip(label: "All", isSelected: viewModel.selectedSkill.isEmpty) {
                            viewModel.selectedSkill = ""
                        }
                        ForEach(viewModel.availableSkills, id: \.self) { skill in
                            filterChip(label: skill, isSelected: viewModel.selectedSkill == skill) {
                                viewModel.selectedSkill = viewModel.selectedSkill == skill ? "" : skill
                            }
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.bar)
    }

    private func filterChip(label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color.blue.opacity(0.1))
                .foregroundStyle(isSelected ? .white : .blue)
                .clipShape(.capsule)
        }
    }

    private var profileList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.filteredProfiles) { profile in
                    NavigationLink(value: profile) {
                        UserProfileCardView(profile: profile) {
                            Task { try? await ConnectionService().sendRequest(to: profile.id) }
                        }
                    }
                    .buttonStyle(.plain)
                }
                if viewModel.filteredProfiles.isEmpty && !viewModel.isLoading {
                    Text("No profiles match your filters")
                        .foregroundStyle(.secondary)
                        .padding(.top, 40)
                }
            }
            .padding()
        }
        .refreshable { await viewModel.loadProfiles() }
        .overlay {
            if viewModel.isLoading && viewModel.profiles.isEmpty {
                ProgressView()
            }
        }
    }
}

#Preview {
    DiscoverView()
}
