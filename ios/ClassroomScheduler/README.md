# Classroom Scheduler - iOS App

A native iOS application for displaying classroom schedules on iPads in kiosk mode.

## Features

- 🎯 **MDM Configuration Support** - Room assignments pushed via MDM
- 🔄 **Real-time Updates** - Server-Sent Events (SSE) for instant updates
- 📱 **Kiosk Mode** - Designed for Single App Mode deployment
- 🎨 **SwiftUI** - Modern, declarative UI matching web design
- 🌐 **API Integration** - Connects to existing Next.js backend

## Requirements

- iOS 15.0+
- Xcode 15.0+
- Swift 5.9+

## Project Structure

```
ClassroomScheduler/
├── ClassroomScheduler.xcodeproj
├── ClassroomScheduler/
│   ├── App/
│   │   ├── ClassroomSchedulerApp.swift      # App entry point
│   │   └── AppDelegate.swift                # App lifecycle
│   ├── Views/
│   │   ├── DisplayView.swift                # Main display screen
│   │   ├── EventCardView.swift              # Event card component
│   │   ├── CurrentEventView.swift           # Current event display
│   │   └── LoadingView.swift                # Loading state
│   ├── Models/
│   │   ├── Event.swift                      # Event data model
│   │   ├── Room.swift                       # Room data model
│   │   └── AppConfig.swift                  # App configuration
│   ├── Services/
│   │   ├── APIService.swift                 # API client
│   │   ├── ConfigurationService.swift       # MDM config reader
│   │   └── EventSourceService.swift         # SSE connection
│   ├── Utilities/
│   │   └── Extensions.swift                 # Helper extensions
│   └── Resources/
│       ├── Assets.xcassets                  # Images and colors
│       └── Info.plist                       # App configuration
└── README.md
```

## MDM Configuration

Deploy the app with the following managed configuration keys:

```xml
<key>roomId</key>
<integer>3</integer>
<key>tenantId</key>
<integer>1</integer>
<key>apiBaseURL</key>
<string>https://your-app.vercel.app</string>
```

## API Endpoints Used

- `GET /api/rooms?tenant_id={tenantId}` - Fetch room details
- `GET /api/events?room_id={roomId}&start_date={start}&end_date={end}&tenant_id={tenantId}` - Fetch events
- `GET /api/events/stream` - SSE connection for real-time updates

## Building & Running

1. Open `ClassroomScheduler.xcodeproj` in Xcode
2. Select your target device/simulator
3. Build and run (⌘R)

For testing without MDM, edit the scheme to set environment variables:
- `ROOM_ID`: Room ID to display
- `TENANT_ID`: Tenant ID
- `API_BASE_URL`: API endpoint

## Deployment

1. Archive the app in Xcode
2. Upload to App Store Connect or your MDM solution
3. Configure managed app configuration in your MDM
4. Deploy to iPads in Single App Mode

## License

Proprietary - Internal Use Only
