# Classroom Scheduler - Android Tablet App

Android tablet application for displaying classroom schedules with real-time updates. This app mirrors the functionality of the iOS iPad version.

## Features

- **Device Pairing**: Easy setup using pairing tokens from admin dashboard
- **Manual Configuration**: Alternative setup with room ID, tenant ID, and API URL
- **Real-Time Updates**: Server-Sent Events (SSE) for instant schedule changes
- **Offline Resilience**: Automatic polling fallback when SSE disconnects
- **Heartbeat Monitoring**: Regular device status updates to server
- **MDM Support**: Enterprise deployment with managed configuration
- **Kiosk Mode**: Fullscreen display optimized for tablets

## Technology Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Architecture**: Clean Architecture (Data/Domain/Presentation)
- **Networking**: Retrofit + OkHttp
- **Real-Time**: OkHttp SSE
- **Dependency Injection**: Hilt
- **Image Loading**: Coil
- **Background Tasks**: WorkManager

## Build Instructions

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK with API 34

### Building the App

1. Open the project in Android Studio:
   ```bash
   cd /path/to/ipad-classroom-scheduler/android
   ```

2. Sync Gradle files (Android Studio will prompt automatically)

3. Build the debug APK:
   ```bash
   ./gradlew assembleDebug
   ```

4. Build the release APK:
   ```bash
   ./gradlew assembleRelease
   ```

The APK will be located at: `app/build/outputs/apk/debug/app-debug.apk`

### Installing on Device

Via USB debugging:
```bash
./gradlew installDebug
```

Or manually install the APK:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Configuration

### Option 1: Pairing Token (Recommended)

1. Launch the app on the tablet
2. Select "Pairing Token" tab
3. Enter the pairing token from the admin dashboard
4. Tap "Pair Device"

### Option 2: Manual Configuration

1. Launch the app
2. Select "Manual Config" tab
3. Enter:
   - Room ID
   - Tenant ID
   - API Base URL (e.g., `https://your-domain.com`)
4. Tap "Save Configuration"

### Option 3: MDM Deployment

For enterprise deployment, configure managed app settings in your MDM:

```xml
<restrictions>
    <integer name="roomId" value="3" />
    <integer name="tenantId" value="1" />
    <string name="apiBaseURL" value="https://your-app.vercel.app" />
    <integer name="deviceId" value="123" />
</restrictions>
```

## Kiosk Mode Setup

### Using Android Enterprise

1. Enroll device in Android Enterprise
2. Create a kiosk policy in your MDM
3. Set Classroom Scheduler as the only allowed app
4. Deploy to target devices

### Using Third-Party Kiosk Apps

Alternatively, use apps like:
- **Kiosk Browser Lockdown**
- **SureLock**
- **Hexnode Kiosk Lockdown**

## API Endpoints

The app communicates with the following endpoints:

- `GET /api/rooms` - Fetch room details
- `GET /api/events` - Fetch events for date range
- `GET /api/events/stream` - SSE stream for real-time updates
- `POST /api/device/validate-token` - Validate pairing token
- `POST /api/device/heartbeat` - Send device heartbeat

## Troubleshooting

### App won't connect to API

- Verify the API Base URL is correct
- Check network connectivity
- Ensure firewall allows outbound HTTPS
- For local testing, use device's IP address, not `localhost`

### SSE not working

- Check that `/api/events/stream` endpoint is accessible
- Verify network doesn't block long-lived connections
- App will fall back to 30-second polling automatically

### Heartbeat not sending

- Verify device ID is configured
- Check WorkManager is not restricted by battery optimization
- Review logs: `adb logcat | grep HeartbeatWorker`

### Configuration not persisting

- Check app has storage permissions
- Verify SharedPreferences are not being cleared
- For MDM: ensure managed configuration is properly deployed

## Development

### Project Structure

```
app/src/main/java/com/classroomscheduler/
├── data/
│   ├── models/          # Event, Room, AppConfig
│   ├── remote/          # ApiService, SseService
│   └── repository/      # ConfigRepository
├── di/                  # Hilt modules
├── presentation/
│   ├── configuration/   # Setup screens
│   ├── display/         # Main display screen
│   └── theme/           # Compose theme
└── services/            # HeartbeatWorker
```

### Running Tests

```bash
./gradlew test
```

### Viewing Logs

```bash
adb logcat | grep -E "DisplayViewModel|SseService|HeartbeatWorker"
```

## Version

**Current Version**: 2.5.3

Matches iOS app version for feature parity.

## Support

For issues or questions, contact your development team or refer to the main project documentation.
