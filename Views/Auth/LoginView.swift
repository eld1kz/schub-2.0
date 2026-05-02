import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showError = false

    var body: some View {
        NavigationStack {
            VStack(spacing: StyleConstants.spacing) {
                Spacer()

                Text("Schub")
                    .font(.largeTitle.bold())
                    .padding(.bottom, 16)

                VStack(spacing: 12) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(CustomTextFieldStyle())

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .textFieldStyle(CustomTextFieldStyle())
                }

                Button {
                    Task { await authViewModel.signIn(email: email, password: password) }
                } label: {
                    Text("Log In")
                }
                .buttonStyle(PrimaryButtonStyle(isLoading: authViewModel.isLoading))
                .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)
                .padding(.top, 8)

                NavigationLink {
                    SignUpView()
                } label: {
                    Text("Don't have an account? Sign Up")
                }
                .buttonStyle(SecondaryButtonStyle())

                Spacer()
            }
            .padding(.horizontal, StyleConstants.horizontalPadding)
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { authViewModel.errorMessage = nil }
            } message: {
                Text(authViewModel.errorMessage ?? "")
            }
            .onChange(of: authViewModel.errorMessage) { _, newValue in
                showError = newValue != nil
            }
        }
    }
}

#Preview {
    LoginView()
        .environment(AuthViewModel())
}
