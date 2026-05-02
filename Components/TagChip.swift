import SwiftUI

struct TagChip: View {
    let text: String
    var onDelete: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 4) {
            Text(text)
                .font(.caption)
            if let onDelete {
                Button(action: onDelete) {
                    Image(systemName: "xmark")
                        .font(.caption2)
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.blue.opacity(0.12))
        .foregroundStyle(.blue)
        .clipShape(.capsule)
    }
}

#Preview {
    HStack {
        TagChip(text: "Swift")
        TagChip(text: "SwiftUI") { }
    }
    .padding()
}
