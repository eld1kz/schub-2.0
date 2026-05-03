import SwiftUI

struct PostComposerSheet: View {
    let onPost: (String) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var content = ""
    @State private var isPosting = false
    @FocusState private var focused: Bool

    private let maxChars = 280
    private var remaining: Int { maxChars - content.count }

    var body: some View {
        VStack(spacing: 0) {
            header
            Rectangle().fill(DesignTokens.separator).frame(height: 1)
            composeArea
            Spacer()
            Rectangle().fill(DesignTokens.separator).frame(height: 1)
            bottomBar
        }
        .onAppear { focused = true }
    }

    private var header: some View {
        HStack {
            Button("Cancel") { dismiss() }
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
            Spacer()
            Button {
                isPosting = true
                Task {
                    try? await onPost(content)
                    dismiss()
                }
            } label: {
                Group {
                    if isPosting {
                        ProgressView().tint(.black).scaleEffect(0.8)
                    } else {
                        Text("Post").font(.subheadline.bold()).foregroundStyle(.black)
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 7)
                .background(DesignTokens.accentText)
                .clipShape(.capsule)
                .opacity(content.trimmingCharacters(in: .whitespaces).isEmpty || isPosting ? 0.5 : 1)
            }
            .disabled(content.trimmingCharacters(in: .whitespaces).isEmpty || isPosting)
        }
        .padding(16)
    }

    private var composeArea: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(LinearGradient(
                    colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                .frame(width: 36, height: 36)
            TextField("What are you building?", text: $content, axis: .vertical)
                .font(.body)
                .foregroundStyle(DesignTokens.textPrimary)
                .lineLimit(4...12)
                .focused($focused)
                .onChange(of: content) { _, new in
                    if new.count > maxChars { content = String(new.prefix(maxChars)) }
                }
        }
        .padding(16)
    }

    private var bottomBar: some View {
        HStack(spacing: 16) {
            Button {} label: {
                Image(systemName: "photo")
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.accentText)
            }
            Button {} label: {
                Image(systemName: "link")
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.accentText)
            }
            Spacer()
            ZStack {
                Circle()
                    .stroke(remaining < 20 ? Color.red : remaining < 60 ? Color.yellow : DesignTokens.separator,
                            lineWidth: 2)
                    .frame(width: 24, height: 24)
                if remaining < 60 {
                    Text("\(remaining)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(remaining < 20 ? .red : DesignTokens.textTertiary)
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }
}

#Preview {
    PostComposerSheet { _ in }
        .background(DesignTokens.background)
        .preferredColorScheme(.dark)
}
