//
//  Schub_2_0App.swift
//  Schub 2.0
//
//  Created by Eldar Ugay on 27.04.2026.
//

import SwiftUI
import SwiftData

@main
struct Schub_2_0App: App {
    @State private var authViewModel = AuthViewModel()

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                AppView()
            } else {
                LoginView()
            }
        }
        .environment(authViewModel)
        .modelContainer(sharedModelContainer)
    }
}
