import SwiftUI

struct ExperienceEditSheet: View {
    @Binding var experience: ProfileExperience
    let isNew: Bool
    let onSave: () -> Void
    let onRemove: (() -> Void)?

    @Environment(\.dismiss) private var dismiss

    private let months = ProfileExperience.monthNames
    private let years: [Int] = {
        let y = Calendar.current.component(.year, from: Date())
        return Array((y - 20)...(y + 2))
    }()

    var body: some View {
        NavigationStack {
            ZStack {
                PC.bg.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 12) {
                        floatField("Role / Title", text: $experience.role)
                        floatField("Company", text: $experience.company)
                        floatField("Location", text: $experience.location)
                        startDatePicker
                        currentToggle
                        if !experience.isPresent {
                            endDatePicker
                        }
                        floatField("Description", text: $experience.description, multiline: true)
                        if let onRemove {
                            removeButton(onRemove)
                        }
                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                }
            }
            .navigationTitle(isNew ? "Add Experience" : "Edit Experience")
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
        !experience.role.trimmingCharacters(in: .whitespaces).isEmpty &&
        !experience.company.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Date Pickers

    private var startDatePicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Start Date")
                .font(.inter(11))
                .foregroundStyle(PC.p3)
                .padding(.horizontal, 14)
                .padding(.top, 10)
            HStack(spacing: 0) {
                Picker("Month", selection: $experience.startMonth) {
                    ForEach(1...12, id: \.self) { i in
                        Text(months[i - 1]).tag(i)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .clipped()

                Picker("Year", selection: $experience.startYear) {
                    ForEach(years.reversed(), id: \.self) { Text(String($0)).tag($0) }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .clipped()
            }
            .frame(height: 100)
        }
        .background(PC.field)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var endDatePicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("End Date")
                .font(.inter(11))
                .foregroundStyle(PC.p3)
                .padding(.horizontal, 14)
                .padding(.top, 10)
            HStack(spacing: 0) {
                Picker("Month", selection: Binding(
                    get: { experience.endMonth ?? 1 },
                    set: { experience.endMonth = $0 }
                )) {
                    ForEach(1...12, id: \.self) { i in
                        Text(months[i - 1]).tag(i)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .clipped()

                Picker("Year", selection: Binding(
                    get: { experience.endYear ?? Calendar.current.component(.year, from: Date()) },
                    set: { experience.endYear = $0 }
                )) {
                    ForEach(years.reversed(), id: \.self) { Text(String($0)).tag($0) }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .clipped()
            }
            .frame(height: 100)
        }
        .background(PC.field)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var currentToggle: some View {
        HStack {
            Text("Currently working here")
                .font(.inter(13))
                .foregroundStyle(PC.p1)
            Spacer()
            Toggle("", isOn: $experience.isPresent)
                .labelsHidden()
                .tint(PC.green)
                .onChange(of: experience.isPresent) { _, isPresent in
                    if isPresent {
                        experience.endMonth = nil
                        experience.endYear = nil
                    } else {
                        let now = Calendar.current
                        experience.endMonth = now.component(.month, from: Date())
                        experience.endYear  = now.component(.year,  from: Date())
                    }
                }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
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
            Text("Remove Experience")
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
    ExperienceEditSheet(
        experience: .constant(ProfileExperience(
            role: "iOS Engineer",
            company: "Schub",
            isPresent: true
        )),
        isNew: false,
        onSave: {},
        onRemove: {}
    )
}
