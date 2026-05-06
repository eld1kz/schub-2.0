//
//  Schub_2_0App.swift
//  Schub 2.0
//
//  Created by Eldar Ugay on 27.04.2026.
//

import SwiftUI
import SwiftData
import UIKit

@main
struct Schub_2_0App: App {
    @State private var authViewModel = AuthViewModel()

    init() {
        configureTabBarAppearance()
    }

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
                    .preferredColorScheme(.dark)
            } else {
                LoginView()
                    .preferredColorScheme(.dark)
            }
        }
        .environment(authViewModel)
        .modelContainer(sharedModelContainer)
    }

    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color(hex: "#0e0e10"))
        appearance.shadowColor = UIColor.white.withAlphaComponent(0.06)

        let normalColor = UIColor(Color.white.opacity(0.38))
        let selectedColor = UIColor(Color.white.opacity(0.95))

        [appearance.stackedLayoutAppearance,
         appearance.inlineLayoutAppearance,
         appearance.compactInlineLayoutAppearance].forEach { itemAppearance in
            itemAppearance.normal.iconColor = normalColor
            itemAppearance.normal.titleTextAttributes = [.foregroundColor: normalColor]
            itemAppearance.selected.iconColor = selectedColor
            itemAppearance.selected.titleTextAttributes = [.foregroundColor: selectedColor]
        }

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().unselectedItemTintColor = normalColor
        UITabBar.appearance().tintColor = selectedColor
    }
}
