import SwiftUI

struct EducationEditSheet: View {
    @Binding var education: ProfileEducation
    let isNew: Bool
    let onSave: () -> Void
    let onRemove: (() -> Void)?

    @Environment(\.dismiss) private var dismiss

    private let years: [Int] = {
        let y = Calendar.current.component(.year, from: Date())
        return Array((y - 20)...(y + 8))
    }()

    var body: some View {
        NavigationStack {
            ZStack {
                PC.bg.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 12) {
                        floatField("School", text: $education.school)
                        floatField("Degree", text: $education.degree)
                        floatField("Field of Study", text: $education.field)
                        floatField("GPA (optional)", text: $education.gpa)
                        startYearPicker
                        endYearPicker
                        floatField("Description (optional)", text: $education.description, multiline: true)
                        if let onRemove {
                            removeButton(onRemove)
                        }
                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                }
            }
            .navigationTitle(isNew ? "Add Education" : "Edit Education")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(PC.bg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(.inter(13))
                        .foregroundStyle(PC.p3)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave()
                        dismiss()
                    }
                    .font(.custom("SpaceGrotesk-Bold", size: 13))
                    .foregroundStyle(canSave ? PC.accentDot : PC.p3)
                    .disabled(!canSave)
                }
            }
        }
        .presentationBackground(PC.bg)
        .presentationDragIndicator(.hidden)
    }

    private var canSave: Bool {
        !education.school.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Year Pickers

    private var startYearPicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Start Year")
                .font(.inter(11))
                .foregroundStyle(PC.p3)
                .padding(.horizontal, 14)
                .padding(.top, 10)
            Picker("", selection: $education.startYear) {
                ForEach(years.reversed(), id: \.self) { Text(String($0)).tag($0) }
            }
            .pickerStyle(.wheel)
            .frame(height: 100)
            .clipped()
        }
        .background(PC.field)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var endYearPicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("End Year (0 = Present)")
                .font(.inter(11))
                .foregroundStyle(PC.p3)
                .padding(.horizontal, 14)
                .padding(.top, 10)
            Picker("", selection: $education.endYear) {
                Text("Present").tag(0)
                ForEach(years.reversed(), id: \.self) { Text(String($0)).tag($0) }
            }
            .pickerStyle(.wheel)
            .frame(height: 100)
            .clipped()
        }
        .background(PC.field)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Helpers

    private func floatField(_ label: String, text: Binding<String>, multiline: Bool = false) -> some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PC.field)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.inter(11))
                    .foregroundStyle(PC.p3)
                    .padding(.horizontal, 14)
                    .padding(.top, 10)
                if multiline {
                    TextField("", text: text, axis: .vertical)
                        .lineLimit(3...6)
                        .font(.inter(14))
                        .foregroundStyle(PC.p1)
                        .padding(.horizontal, 14)
                        .padding(.top, 2)
                        .padding(.bottom, 10)
                } else {
                    TextField("", text: text)
                        .font(.inter(14))
                        .foregroundStyle(PC.p1)
                        .padding(.horizontal, 14)
                        .padding(.top, 2)
                        .padding(.bottom, 10)
                }
            }
        }
    }

    private func removeButton(_ action: @escaping () -> Void) -> some View {
        Button(role: .destructive, action: {
            action()
            dismiss()
        }) {
            Text("Remove Education")
                .font(.inter(14, weight: .medium))
                .foregroundStyle(Color.red.opacity(0.7))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color.red.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(.top, 8)
    }
}

#Preview {
    EducationEditSheet(
        education: .constant(ProfileEducation(
            school: "MIT",
            degree: "B.S.",
            field: "Computer Science",
            startYear: 2022,
            endYear: 2026
        )),
        isNew: false,
        onSave: {},
        onRemove: {}
    )
}
