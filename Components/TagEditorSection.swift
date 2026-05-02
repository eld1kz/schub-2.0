import SwiftUI

struct TagEditorSection: View {
    let title: String
    @Binding var tags: [String]
    @State private var input = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)

            if !tags.isEmpty {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 70), alignment: .leading)],
                    alignment: .leading,
                    spacing: 8
                ) {
                    ForEach(tags, id: \.self) { tag in
                        TagChip(text: tag) {
                            tags.removeAll { $0 == tag }
                        }
                    }
                }
            }

            HStack {
                TextField("Add \(title.lowercased().dropLast())…", text: $input)
                    .textFieldStyle(.roundedBorder)
                    .autocapitalization(.none)
                    .onSubmit { addTag() }
                Button("Add", action: addTag)
                    .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private func addTag() {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !tags.contains(trimmed) else { return }
        tags.append(trimmed)
        input = ""
    }
}

#Preview {
    @Previewable @State var tags = ["Swift", "iOS"]
    TagEditorSection(title: "Skills", tags: $tags)
        .padding()
}
