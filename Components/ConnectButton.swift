import SwiftUI
import Supabase

enum ConnectState: Equatable {
    case none, pending, connected
}

struct ConnectButton: View {
    let targetUserId: UUID
    let currentUserId: UUID
    var initialState: ConnectState = .none
    var onMessage: () -> Void = {}

    @State private var state: ConnectState
    @State private var pressed = false
    @State private var isWorking = false
    @State private var showCancelConfirmation = false
    @State private var isOutgoingPending = false
    private let indigo = Color(hex: "#4F46E5")

    init(
        targetUserId: UUID,
        currentUserId: UUID,
        initialState: ConnectState = .none,
        onMessage: @escaping () -> Void = {}
    ) {
        self.targetUserId = targetUserId
        self.currentUserId = currentUserId
        self._state = State(wrappedValue: initialState)
        self.onMessage = onMessage
    }

    var body: some View {
        Button { handleTap() } label: {
            HStack(spacing: 6) {
                Image(systemName: stateIcon)
                    .font(.system(size: 13, weight: .semibold))
                Text(stateLabel)
                    .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(foregroundColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(borderColor, lineWidth: state == .pending ? 1 : 0)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentTransition(.opacity)
            .opacity(isWorking ? 0.72 : 1)
        }
        .buttonStyle(.plain)
        .scaleEffect(pressed ? 0.94 : 1)
        .animation(.spring(response: 0.25, dampingFraction: 0.55), value: pressed)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: state)
        .disabled(isWorking)
        .task {
            guard initialState == .none else { return }
            await loadStatus()
        }
        .alert("Cancel connection request?", isPresented: $showCancelConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Confirm", role: .destructive) {
                Task { await cancelPendingRequest() }
            }
        } message: {
            Text("This request will be removed.")
        }
    }

    private var stateIcon: String {
        switch state {
        case .none:      return "person.badge.plus"
        case .pending:   return "xmark"
        case .connected: return "message.fill"
        }
    }

    private var stateLabel: String {
        switch state {
        case .none:      return "Connect"
        case .pending:   return "Pending"
        case .connected: return "Message"
        }
    }

    private var foregroundColor: Color {
        state == .pending ? DesignTokens.textPrimary : .white
    }

    private var backgroundColor: Color {
        switch state {
        case .none, .connected:
            return indigo
        case .pending:
            return DesignTokens.background
        }
    }

    private var borderColor: Color {
        state == .pending ? DesignTokens.separator : .clear
    }

    private func handleTap() {
        switch state {
        case .none:
            print("[ConnectButton] Connect tapped → target: \(targetUserId)")
            isWorking = true
            withAnimation(.spring(response: 0.12, dampingFraction: 0.8)) { pressed = true }
            Task {
                try? await Task.sleep(for: .milliseconds(140))
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    pressed = false
                    state = .pending
                    isOutgoingPending = true
                }
                do {
                    try await ConnectionService().sendRequest(to: targetUserId)
                } catch {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        state = .none
                        isOutgoingPending = false
                    }
                }
                isWorking = false
            }
        case .pending:
            guard isOutgoingPending else { return }
            showCancelConfirmation = true
        case .connected:
            print("[ConnectButton] Message tapped → target: \(targetUserId)")
            withAnimation(.spring(response: 0.12, dampingFraction: 0.8)) { pressed = true }
            Task {
                try? await Task.sleep(for: .milliseconds(100))
                withAnimation { pressed = false }
            }
            onMessage()
        }
    }

    private func loadStatus() async {
        struct R: Decodable {
            let status: String
            let senderId: UUID
            let receiverId: UUID
            enum CodingKeys: String, CodingKey {
                case status
                case senderId = "sender_id"
                case receiverId = "receiver_id"
            }
        }
        let rows: [R] = (try? await SupabaseService.shared.client
            .from("connections")
            .select("status,sender_id,receiver_id")
            .or("and(sender_id.eq.\(currentUserId),receiver_id.eq.\(targetUserId)),and(sender_id.eq.\(targetUserId),receiver_id.eq.\(currentUserId))")
            .limit(1)
            .execute().value) ?? []
        guard let row = rows.first else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            if row.status == "accepted" {
                state = .connected
                isOutgoingPending = false
            } else {
                state = .pending
                isOutgoingPending = row.senderId == currentUserId && row.receiverId == targetUserId
            }
        }
    }

    private func cancelPendingRequest() async {
        isWorking = true
        do {
            try await ConnectionService().cancelRequest(to: targetUserId)
            withAnimation(.spring(response: 0.34, dampingFraction: 0.78)) {
                state = .none
                isOutgoingPending = false
            }
        } catch {
            print("[ConnectButton] cancel request failed: \(error)")
        }
        isWorking = false
    }
}

#Preview {
    VStack(spacing: 16) {
        ConnectButton(targetUserId: UUID(), currentUserId: UUID(), initialState: .none)
        ConnectButton(targetUserId: UUID(), currentUserId: UUID(), initialState: .pending)
        ConnectButton(targetUserId: UUID(), currentUserId: UUID(), initialState: .connected)
    }
    .padding()
    .background(Color(hex: "#0e0e10"))
    .preferredColorScheme(.dark)
}
