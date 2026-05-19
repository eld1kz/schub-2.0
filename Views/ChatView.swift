import SwiftUI

struct ChatView: View {
    @State private var vm: ChatViewModel
    @State private var draftText = ""
    private let indigo = Color(hex: "#4F46E5")

    init(conversation: ConversationItem, currentUserId: UUID) {
        _vm = State(wrappedValue: ChatViewModel(conversation: conversation, currentUserId: currentUserId))
    }

    var body: some View {
        VStack(spacing: 0) {
            messageList
            inputBar
        }
        .background(DesignTokens.background.ignoresSafeArea())
        .navigationTitle(vm.conversation.otherUserName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(DesignTokens.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .onDisappear { vm.stopRealtime() }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 2) {
                    ForEach(vm.messages) { msg in
                        bubbleRow(msg).id(msg.id)
                    }
                    Color.clear.frame(height: 4).id("bottom")
                }
                .padding(.horizontal, 12)
                .padding(.top, 10)
            }
            .onChange(of: vm.messages.count) {
                withAnimation(.easeOut(duration: 0.2)) {
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
            .task {
                await vm.load()
                proxy.scrollTo("bottom", anchor: .bottom)
            }
        }
    }

    @ViewBuilder
    private func bubbleRow(_ msg: Message) -> some View {
        let isMine = msg.senderId == vm.currentUserId
        HStack(alignment: .bottom, spacing: 6) {
            if !isMine {
                AvatarView(
                    url: vm.conversation.otherUserAvatar,
                    name: vm.conversation.otherUserName,
                    size: 28
                )
            } else {
                Spacer(minLength: 60)
            }

            VStack(alignment: isMine ? .trailing : .leading, spacing: 3) {
                Text(msg.content)
                    .font(.system(size: 15))
                    .foregroundStyle(isMine ? .white : DesignTokens.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isMine ? indigo : DesignTokens.cardFill)
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: isMine ? 18 : 4,
                            bottomLeadingRadius: 18,
                            bottomTrailingRadius: isMine ? 4 : 18,
                            topTrailingRadius: 18
                        )
                    )

                Text(timeString(msg.createdAt))
                    .font(.system(size: 11))
                    .foregroundStyle(DesignTokens.textTertiary)
            }

            if isMine {
                // bubble is right-aligned via leading Spacer
            } else {
                Spacer(minLength: 60)
            }
        }
        .padding(.vertical, 2)
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Message…", text: $draftText, axis: .vertical)
                .font(.system(size: 15))
                .foregroundStyle(DesignTokens.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(DesignTokens.cardFill)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .lineLimit(1...5)

            Button {
                let text = draftText
                draftText = ""
                Task { await vm.send(text) }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(
                        draftText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? DesignTokens.textTertiary : indigo
                    )
            }
            .disabled(draftText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(DesignTokens.background)
    }

    private func timeString(_ date: Date) -> String {
        let f = DateFormatter()
        f.timeStyle = .short
        return f.string(from: date)
    }
}

#Preview {
    NavigationStack {
        ChatView(
            conversation: ConversationItem(
                conversation: Conversation(
                    id: UUID(), participantOne: UUID(), participantTwo: UUID(),
                    lastMessage: "Hey!", lastMessageAt: Date(), createdAt: Date()
                ),
                otherUserName: "Eldar", otherUserAvatar: "", unreadCount: 0
            ),
            currentUserId: UUID()
        )
    }
    .preferredColorScheme(.dark)
}
