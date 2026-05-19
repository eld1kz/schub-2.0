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
            .foregroundStyle(state == .pending ? DesignTokens.textSecondary : .white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(state == .pending ? DesignTokens.cardFill : indigo)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentTransition(.opacity)
        }
        .buttonStyle(.plain)
        .scaleEffect(pressed ? 0.94 : 1)
        .animation(.spring(response: 0.25, dampingFraction: 0.55), value: pressed)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: state)
        .disabled(state == .pending)
        .task {
            guard initialState == .none else { return }
            await loadStatus()
        }
    }

    private var stateIcon: String {
        switch state {
        case .none:      return "person.badge.plus"
        case .pending:   return "clock"
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

    private func handleTap() {
        switch state {
        case .none:
            print("[ConnectButton] Connect tapped → target: \(targetUserId)")
            withAnimation(.spring(response: 0.12, dampingFraction: 0.8)) { pressed = true }
            Task {
                try? await Task.sleep(for: .milliseconds(140))
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    pressed = false
                    state = .pending
                }
            }
            Task { try? await ConnectionService().sendRequest(to: targetUserId) }
        case .pending:
            break
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
            enum CodingKeys: String, CodingKey { case status }
        }
        let rows: [R] = (try? await SupabaseService.shared.client
            .from("connections")
            .select("status")
            .or("and(sender_id.eq.\(currentUserId),receiver_id.eq.\(targetUserId)),and(sender_id.eq.\(targetUserId),receiver_id.eq.\(currentUserId))")
            .limit(1)
            .execute().value) ?? []
        guard let row = rows.first else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            state = row.status == "accepted" ? .connected : .pending
        }
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
