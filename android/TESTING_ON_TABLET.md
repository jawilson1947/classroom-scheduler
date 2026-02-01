# Testing on Android Tablet

This guide explains how to test the Classroom Scheduler app on a physical Android tablet before publishing to Google Play.

## Quick Start

**Fastest way to test** (debug build):
```bash
cd /Users/jimwilson/ipad-classroom-scheduler/android
./gradlew installDebug
```

**Test release version** (signed, minified):
```bash
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## Prerequisites

### 1. Enable Developer Options on Tablet

1. Open **Settings > About tablet**
2. Tap **Build number** 7 times
3. You'll see "You are now a developer!"

### 2. Enable USB Debugging

1. Open **Settings > Developer options**
2. Toggle **USB debugging** ON
3. Connect tablet to computer via USB cable
4. Approve the "Allow USB debugging?" prompt on tablet
5. Check "Always allow from this computer" (optional)

### 3. Verify Device Connection

```bash
# Check if device is detected
adb devices
```

**Expected output**:
```
List of devices attached
ABC123XYZ    device
```

If you see "unauthorized", check the tablet for the authorization prompt.

---

## Installation Methods

### Method 1: Direct Install (Recommended)

**Debug Build** (faster, includes debugging symbols):
```bash
cd /Users/jimwilson/ipad-classroom-scheduler/android
./gradlew installDebug
```

**Release Build** (production-ready, minified):
```bash
./gradlew installRelease
```

The app will automatically install and appear in your app drawer.

---

### Method 2: Build Then Install

**Step 1: Build the APK**
```bash
# For debug
./gradlew assembleDebug

# For release
./gradlew assembleRelease
```

**Step 2: Install via ADB**
```bash
# Debug APK
adb install app/build/outputs/apk/debug/app-debug.apk

# Release APK
adb install app/build/outputs/apk/release/app-release.apk

# Use -r flag to replace existing installation
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

### Method 3: Manual Installation (No USB Cable)

**Step 1: Build the APK**
```bash
./gradlew assembleRelease
```

**Step 2: Transfer APK to Tablet**
- Email the APK to yourself
- Upload to Google Drive/Dropbox
- Or copy via USB to Downloads folder

**Step 3: Install on Tablet**
1. Open the APK file on tablet
2. Tap "Install" when prompted
3. If blocked, go to **Settings > Security > Unknown sources** and enable
4. Return and tap "Install" again

---

## Testing Checklist

### ✅ Initial Setup
- [ ] App launches without crashes
- [ ] Configuration screen appears (first launch)
- [ ] UI renders correctly on tablet screen

### ✅ Configuration Flow

**Pairing Token**:
- [ ] Enter a valid pairing token
- [ ] Verify "Pair Device" button works
- [ ] Check successful pairing message
- [ ] Confirm navigation to display screen

**Manual Configuration**:
- [ ] Switch to "Manual Config" tab
- [ ] Enter Room ID, Tenant ID, API Base URL
- [ ] Save configuration
- [ ] Verify navigation to display screen

### ✅ Display Screen

**Header**:
- [ ] Room name and building display correctly
- [ ] Live clock updates every second
- [ ] Current date shows in correct format
- [ ] Online indicator is green

**Events**:
- [ ] Current event shows with "NOW" badge
- [ ] Current event has gradient background
- [ ] Upcoming events display in order
- [ ] Past events show in green/italic
- [ ] Event times are correct
- [ ] Facilitator names display

**Footer**:
- [ ] Version number shows (Ver 2.5.3)
- [ ] Tenant name and address display

### ✅ Interactive Features

**Narrative Modal**:
- [ ] Tap event title
- [ ] Narrative modal opens
- [ ] HTML content renders correctly
- [ ] Close button works

**Facilitator Bio Modal**:
- [ ] Tap facilitator icon
- [ ] Bio modal opens
- [ ] Facilitator photo displays
- [ ] Bio text renders correctly
- [ ] Close button works

**Refresh**:
- [ ] Tap floating refresh button
- [ ] Events reload
- [ ] Loading state shows briefly

### ✅ Real-Time Updates (SSE)

**Create Event**:
1. Open admin dashboard on computer
2. Create a new event for today
3. [ ] Event appears on tablet within seconds
4. [ ] No manual refresh needed

**Update Event**:
1. Edit an existing event
2. [ ] Changes appear on tablet automatically
3. [ ] Event details update correctly

**Delete Event**:
1. Delete an event
2. [ ] Event disappears from tablet
3. [ ] No errors shown

### ✅ Network Scenarios

**Offline Mode**:
- [ ] Disconnect WiFi
- [ ] Online indicator turns red
- [ ] App continues to show cached events
- [ ] Reconnect WiFi
- [ ] Indicator turns green
- [ ] Events refresh automatically

**Poor Connection**:
- [ ] App handles slow network gracefully
- [ ] No crashes during reconnection
- [ ] SSE reconnects after 5 seconds

### ✅ Background Services

**Heartbeat**:
- [ ] Check admin dashboard
- [ ] Device shows as "online"
- [ ] Last heartbeat timestamp updates every 60 seconds

**App Lifecycle**:
- [ ] Press home button (app backgrounds)
- [ ] Wait 2 minutes
- [ ] Return to app
- [ ] Events are current
- [ ] SSE reconnects if needed

### ✅ Performance

- [ ] App launches in < 3 seconds
- [ ] Scrolling is smooth
- [ ] No lag when opening modals
- [ ] Animations are fluid
- [ ] No memory warnings

### ✅ Tablet-Specific

**Orientation**:
- [ ] Rotate to landscape
- [ ] UI adapts correctly
- [ ] Rotate to portrait
- [ ] UI adapts correctly

**Screen Sizes**:
- [ ] Test on 7" tablet (if available)
- [ ] Test on 10" tablet (if available)
- [ ] UI scales appropriately

---

## Viewing Logs

Monitor app behavior in real-time:

**All logs**:
```bash
adb logcat
```

**Filter for Classroom Scheduler**:
```bash
adb logcat | grep "ClassroomScheduler"
```

**Specific components**:
```bash
# SSE service logs
adb logcat -s "SseService"

# ViewModel logs
adb logcat -s "DisplayViewModel" "ConfigurationViewModel"

# Heartbeat logs
adb logcat -s "HeartbeatWorker"

# Multiple tags
adb logcat -s "SseService:D" "DisplayViewModel:D" "HeartbeatWorker:D"
```

**Clear logs**:
```bash
adb logcat -c
```

**Save logs to file**:
```bash
adb logcat > tablet-logs.txt
```

---

## Troubleshooting

### "adb: command not found"

**Option 1**: Install Android SDK Platform Tools
```bash
brew install android-platform-tools
```

**Option 2**: Use Android Studio's adb
```bash
~/Library/Android/sdk/platform-tools/adb devices
```

Add to PATH:
```bash
echo 'export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### "device unauthorized"

1. Check tablet screen for authorization prompt
2. Tap "Allow"
3. Check "Always allow from this computer"
4. Run `adb devices` again

---

### "Installation failed: INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Cause**: Existing app signed with different key

**Solution**: Uninstall first
```bash
adb uninstall com.classroomscheduler
./gradlew installDebug
```

---

### "App crashes on launch"

**Check logs**:
```bash
adb logcat | grep "AndroidRuntime"
```

**Common causes**:
- Missing permissions in AndroidManifest.xml
- Network security config issues
- Proguard rules stripping required classes

**Quick fix**: Test debug build first
```bash
./gradlew installDebug
```

---

### "SSE not connecting"

**Check**:
1. Tablet has internet connection
2. API URL is correct in configuration
3. Device ID is registered in admin dashboard
4. Server is running and accessible

**View SSE logs**:
```bash
adb logcat -s "SseService:D"
```

---

### "Heartbeat not working"

**Check**:
1. Device ID is configured
2. WorkManager is not restricted
3. Battery optimization is disabled for app

**View heartbeat logs**:
```bash
adb logcat -s "HeartbeatWorker:D"
```

---

## Uninstalling the App

**Via ADB**:
```bash
adb uninstall com.classroomscheduler
```

**On Tablet**:
1. Long-press app icon
2. Tap "Uninstall"
3. Confirm

---

## Testing Workflow

**Recommended testing sequence**:

1. **Install debug build**
   ```bash
   ./gradlew installDebug
   ```

2. **Test basic functionality**
   - Configuration
   - Event display
   - Modals

3. **Test real-time updates**
   - Create/edit/delete events
   - Monitor SSE connection

4. **Test release build**
   ```bash
   ./gradlew installRelease
   ```

5. **Verify production behavior**
   - Minified code works
   - No debug logs
   - Performance is good

6. **Final checks**
   - Uninstall and reinstall
   - Test fresh configuration
   - Verify all features

---

## Performance Testing

**Monitor CPU/Memory**:
```bash
# CPU usage
adb shell top -n 1 | grep classroom

# Memory usage
adb shell dumpsys meminfo com.classroomscheduler
```

**Battery usage**:
1. Settings > Battery
2. Find Classroom Scheduler
3. Check battery consumption

**Network usage**:
1. Settings > Data usage
2. Find Classroom Scheduler
3. Monitor data consumption

---

## Next Steps

After successful testing:

1. ✅ Verify all features work correctly
2. ✅ Check performance is acceptable
3. ✅ Test on multiple devices/screen sizes (if available)
4. ✅ Document any issues found
5. ✅ Fix critical bugs
6. 🚀 Ready to publish to Google Play!

See [GOOGLE_PLAY_PUBLISHING.md](GOOGLE_PLAY_PUBLISHING.md) for publishing instructions.
