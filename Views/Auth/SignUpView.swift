import SwiftUI

struct SignUpView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var university = ""
    @State private var graduationYear = Calendar.current.component(.year, from: Date())

    private let years = Array((Calendar.current.component(.year, from: Date()) - 2)...(Calendar.current.component(.year, from: Date()) + 6))

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                TextField("Full Name", text: $name)
                    .textContentType(.name)
                    .textFieldStyle(.roundedBorder)

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $password)
                    .textContentType(.newPassword)
                    .textFieldStyle(.roundedBorder)

                TextField("University", text: $university)
                    .textFieldStyle(.roundedBorder)

                Picker("Graduation Year", selection: $graduationYear) {
                    ForEach(years, id: \.self) { year in
                        Text(String(year)).tag(year)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)

                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

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
                    Group {
                        if authViewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Create Account")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .disabled(authViewModel.isLoading || name.isEmpty || email.isEmpty || password.isEmpty || university.isEmpty)
            }
            .padding(.horizontal, 32)
            .padding(.top, 24)
        }
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.large)
    }
}

#Preview {
    NavigationStack {
        SignUpView()
            .environment(AuthViewModel())
    }
}
