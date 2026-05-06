import SwiftUI

struct InboxView: View {
    var body: some View {
        NavigationStack {
            emptyState
                .background(DesignTokens.background.ignoresSafeArea())
                .navigationTitle("Inbox")
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(DesignTokens.background, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "paperplane")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.textTertiary)
            Text("No messages yet")
                .font(.spaceGrotesk(18, weight: .bold))
                .foregroundStyle(DesignTokens.textPrimary)
            Text("Your messages will appear here")
                .font(.subheadline)
                .foregroundStyle(DesignTokens.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    InboxView()
        .preferredColorScheme(.dark)
}
