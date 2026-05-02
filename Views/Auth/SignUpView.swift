import SwiftUI

struct SignUpView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var university = ""
    @State private var graduationYear = Calendar.current.component(.year, from: Date())
    @State private var showError = false

    private let years = Array((Calendar.current.component(.year, from: Date()) - 2)...(Calendar.current.component(.year, from: Date()) + 6))

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                TextField("Full Name", text: $name)
                    .textContentType(.name)
                    .textFieldStyle(CustomTextFieldStyle())

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .textFieldStyle(CustomTextFieldStyle())

                SecureField("Password", text: $password)
                    .textContentType(.newPassword)
                    .textFieldStyle(CustomTextFieldStyle())

                TextField("University", text: $university)
                    .textFieldStyle(CustomTextFieldStyle())

                Picker("Graduation Year", selection: $graduationYear) {
                    ForEach(years, id: \.self) { Text(String($0)).tag($0) }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)

                Button {
                    Task {
                        await authViewModel.signUp(
                            name: name,
                            email: email,
                            password: password,
                            university: university,
                            graduationYear: graduationYear
                        )
                    }
                } label: {
                    Text("Create Account")
                }
                .buttonStyle(PrimaryButtonStyle(isLoading: authViewModel.isLoading))
                .disabled(authViewModel.isLoading || name.isEmpty || email.isEmpty || password.isEmpty || university.isEmpty)
                .padding(.top, 8)
            }
            .padding(.horizontal, StyleConstants.horizontalPadding)
            .padding(.top, 24)
        }
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.large)
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

#Preview {
    NavigationStack {
        SignUpView()
            .environment(AuthViewModel())
    }
}
