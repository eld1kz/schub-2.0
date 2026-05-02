import SwiftUI

struct PostView: View {
    @State private var viewModel = PostViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $viewModel.title)
                    TextField("Short description…", text: $viewModel.description, axis: .vertical)
                        .lineLimit(3, reservesSpace: true)
                }

                Section {
                    TagEditorSection(title: "Skills Needed", tags: $viewModel.skillsNeeded)
                }

                Section("Stage") {
                    Picker("Stage", selection: $viewModel.stage) {
                        ForEach(Idea.Stage.allCases, id: \.self) { stage in
                            Text(stage.rawValue.capitalized).tag(stage)
                        }
                    }
                    .pickerStyle(.segmented)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("New Idea")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") {
                        Task { await viewModel.submit() }
                    }
                    .disabled(viewModel.title.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isLoading)
                    .overlay {
                        if viewModel.isLoading { ProgressView().scaleEffect(0.7) }
                    }
                }
            }
            .alert("Idea posted!", isPresented: $viewModel.didSubmit) {
                Button("OK", role: .cancel) { }
            }
        }
    }
}

#Preview {
    PostView()
}
