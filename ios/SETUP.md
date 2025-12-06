# Classroom Scheduler iOS App - Setup Guide

## Quick Start

### 1. Create Xcode Project

1. Open Xcode
2. Create a new project: **File → New → Project**
3. Select **iOS → App**
4. Project settings:
   - Product Name: `ClassroomScheduler`
   - Team: Your development team
   - Organization Identifier: `com.yourcompany`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **None**
   - Include Tests: **Optional**

### 2. Add Source Files

Copy all the Swift files from this directory structure into your Xcode project. Ensure "Copy items if needed" is checked.

```
ClassroomScheduler/
├── App/
│   └── ClassroomSchedulerApp.swift
├── Models/
│   ├── Event.swift  (Includes Room struct)
│   └── AppConfig.swift
├── Services/
│   ├── ConfigurationService.swift
│   ├── APIService.swift
│   └── EventSourceService.swift
├── Views/
│   ├── DisplayView.swift
│   ├── CurrentEventView.swift
│   ├── EventCardView.swift
│   └── ConfigurationView.swift
└── Utilities/
    └── Extensions.swift
```

### 3. Configure Info.plist

Use the provided `Resources/Info.plist` file or add the following keys to your project's Info target properties:

| Key | Type | Value | Note |
|-----|------|-------|------|
| UIRequiresFullScreen | Boolean | YES | Application requires full screen |
| UIStatusBarHidden | Boolean | YES | Hide status bar |
| NSAppTransportSecurity | Dictionary | { NSAllowsArbitraryLoads: YES } | Allow HTTP for local testing |
| UIBackgroundModes | Array | item 0: "fetch" | Background fetch capability |

### 4. Configuration & Pairing

The app supports two setup modes:

#### Option A: Pairing Token (Recommended)
1. Launch the app on the iPad
2. Select "Pairing Token" tab
3. Enter the `API Base URL` (e.g., `https://your-domain.com`)
4. Enter the pairing token generated from the Admin Dashboard
5. Tap "Pair Device"

#### Option B: Manual Configuration
1. Launch the app
2. Select "Manual Config" tab
3. Enter Room ID, Tenant ID, and API Base URL manually
4. Tap "Save Configuration"

### 5. Deploy with MDM

#### Create Managed App Configuration

The app supports MDM configuration using standard keys:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>roomId</key>
    <integer>3</integer>
    <key>tenantId</key>
    <integer>1</integer>
    <key>apiBaseURL</key>
    <string>https://your-app.vercel.app</string>
</dict>
</plist>
```

#### Single App Mode Configuration

1. In your MDM, create a new configuration profile
2. Add **Single App Mode** (App Lock) payload
3. Select the Classroom Scheduler app
4. Deploy to target iPads

### 6. Build & Archive

1. Select **Any iOS Device (arm64)** as the destination
2. **Product → Archive**
3. Upload to App Store Connect or export for MDM deployment

## Troubleshooting

### App crashes on launch
- Check that all Swift files are added to the target
- Verify Info.plist configuration

### Can't connect to API
- Check API_BASE_URL is correct
- Ensure iPad has network connectivity
- For localhost testing, use your computer's IP address, not localhost

### SSE not working
- Verify `/api/events/stream` endpoint is accessible
- Check network firewall settings
- Ensure app has network permissions

## Support

For issues or questions, contact your development team.
