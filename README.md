# Schub

**An iOS app where students find teammates, share startup ideas, and discover hackathons, grants and internships.**

Built with SwiftUI and Supabase.

## Features

- **Feed** — post updates and startup ideas; like and comment on both.
- **Ideas** — each idea lists its stage (idea / building / launched) and the skills and roles it needs.
- **Discover** — smart matching ranks other students by how well their skills fit yours, with filters for developers, designers, marketing, business and data/AI.
- **Connect** — send connection requests and get notified when they're accepted.
- **Opportunities** — browse hackathons, grants, internships and competitions, and apply in-app.
- **Inbox** — real-time messaging with Supabase Realtime.
- **Profile** — photo upload, education, experience, links and skill tags.

## Tech stack

| Part | Technology |
|---|---|
| UI | SwiftUI |
| Architecture | MVVM (Views → ViewModels → Services) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Concurrency | Swift async/await |

## Project structure

```
Views/        screens (feed, discover, opportunities, inbox, profile, auth)
Components/   reusable UI (cards, chips, avatar, buttons)
ViewModels/   state and actions for each screen
Services/     Supabase access (posts, connections, applications, notifications)
Models/       Codable data models
```

## Running it

1. Open the project in Xcode.
2. Create a Supabase project and put its URL and publishable key in `Config.swift`.
3. Build and run on an iOS simulator or device.
