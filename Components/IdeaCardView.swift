import SwiftUI

struct IdeaCardView: View {
    let item: FeedIdea
    var onConnect: () -> Void = {}
    @State private var requestSent = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            authorRow
            Text(item.idea.title)
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)
            skillsRow
            connectRow
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.07), radius: 6, y: 2)
    }

    private var authorRow: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(item.authorName.isEmpty ? "Anonymous" : item.authorName)
                .font(.subheadline.bold())
            if !item.authorUniversity.isEmpty {
                Text(item.authorUniversity)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var skillsRow: some View {
        if !item.idea.skillsNeeded.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(item.idea.skillsNeeded, id: \.self) {
                        TagChip(text: $0)
                    }
                }
            }
        }
    }

    private var connectRow: some View {
        HStack {
            Spacer()
            Button(requestSent ? "Requested" : "Connect") {
                onConnect()
                requestSent = true
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .disabled(requestSent)
        }
    }
}

#Preview {
    IdeaCardView(item: FeedIdea(
        idea: Idea(
            id: UUID(),
            authorId: UUID(),
            title: "AI study buddy for university students",
            description: "",
            skillsNeeded: ["Swift", "ML", "Backend"],
            stage: .building,
            createdAt: Date(),
            likesCount: 0
        ),
        authorName: "Eldar Ugay",
        authorUniversity: "MIT"
    ))
    .padding()
}
