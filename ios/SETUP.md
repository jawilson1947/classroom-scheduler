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

Copy all the Swift files from this directory structure into your Xcode project:

```
ClassroomScheduler/
├── App/
│   └── ClassroomSchedulerApp.swift
├── Models/
│   ├── Event.swift
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

Add the following keys to `Info.plist`:

```xml
<key>UIRequiresFullScreen</key>
<true/>
<key>UIStatusBarHidden</key>
<true/>
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 4. Testing Without MDM

#### Option A: Environment Variables
1. Edit Scheme: **Product → Scheme → Edit Scheme**
2. Go to **Run → Arguments**
3. Add Environment Variables:
   - `ROOM_ID`: `3`
   - `TENANT_ID`: `1`
   - `API_BASE_URL`: `http://localhost:3000`

#### Option B: Manual Configuration
1. Run the app
2. Enter configuration details in the setup screen
3. Tap "Save Configuration"

### 5. Deploy with MDM

#### Create Managed App Configuration

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
2. Add **Single App Mode** payload
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
- For localhost testing, use your computer's IP address

### SSE not working
- Verify `/api/events/stream` endpoint is accessible
- Check network firewall settings
- Ensure app has network permissions

## Next Steps

1. Add app icon in Assets.xcassets
2. Configure launch screen
3. Add error handling UI
4. Implement offline caching
5. Add analytics/logging

## Support

For issues or questions, contact your development team.
