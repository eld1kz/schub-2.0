import SwiftUI

struct TagEditorSection: View {
    @Binding var tags: [String]
    @State private var input = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !tags.isEmpty {
                flowChips
            }
            addRow
        }
        .padding(.horizontal, 20)
    }

    private var flowChips: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 72), alignment: .leading)],
            alignment: .leading, spacing: 8
        ) {
            ForEach(tags, id: \.self) { tag in
                HStack(spacing: 4) {
                    Text(tag)
                        .font(.caption.bold())
                        .foregroundStyle(DesignTokens.textPrimary)
                    Button {
                        withAnimation(.easeOut(duration: 0.15)) {
                            tags.removeAll { $0 == tag }
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(DesignTokens.textTertiary)
                    }
                }
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(DesignTokens.fieldFill)
                .clipShape(.capsule)
            }
        }
    }

    private var addRow: some View {
        HStack(spacing: 10) {
            TextField("Add…", text: $input)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textPrimary)
                .autocapitalization(.none)
                .onSubmit { addTag() }
                .padding(.horizontal, 12).padding(.vertical, 10)
                .background(DesignTokens.fieldFill)
                .clipShape(.rect(cornerRadius: 10))
            Button {
                addTag()
            } label: {
                Image(systemName: "plus")
                    .font(.subheadline.bold())
                    .foregroundStyle(.black)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.accentText)
                    .clipShape(Circle())
            }
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private func addTag() {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !tags.contains(trimmed) else { input = ""; return }
        withAnimation(.easeOut(duration: 0.2)) { tags.append(trimmed) }
        input = ""
    }
}

#Preview {
    @Previewable @State var tags = ["Swift", "SwiftUI", "Supabase"]
    TagEditorSection(tags: $tags)
        .background(DesignTokens.background)
}
