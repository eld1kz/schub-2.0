import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Text("Schub")
                    .font(.largeTitle.bold())

                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(.roundedBorder)

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .textFieldStyle(.roundedBorder)
                }

                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await authViewModel.signIn(email: email, password: password) }
                } label: {
                    Group {
                        if authViewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Log In")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)

                NavigationLink("Don't have an account? Sign Up") {
                    SignUpView()
                }
                .font(.subheadline)

                Spacer()
            }
            .padding(.horizontal, 32)
        }
    }
}

#Preview {
    LoginView()
        .environment(AuthViewModel())
}
