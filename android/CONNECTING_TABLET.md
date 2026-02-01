# Connecting Mac to Android Tablet via USB

This guide explains how to connect your Mac to an Android tablet for app development and testing.

## Overview

To install apps from your Mac to an Android tablet, you need to:
1. Enable Developer Options on the tablet
2. Enable USB debugging
3. Connect via USB cable
4. Authorize the connection
5. Verify with `adb devices`

---

## Step 1: Enable Developer Options

Developer Options is a hidden menu on Android devices. Here's how to unlock it:

1. On your Android tablet, open **Settings**
2. Scroll down and tap **About tablet** (or **About device**)
3. Find **Build number** (usually near the bottom)
4. **Tap "Build number" 7 times rapidly**
5. You'll see a toast message: **"You are now a developer!"**

> **Note**: On some devices, Build number might be under:
> - Settings > System > About tablet
> - Settings > About phone > Software information

---

## Step 2: Enable USB Debugging

Now that Developer Options is unlocked:

1. Go back to main **Settings**
2. Scroll down to find **Developer options**
   - Usually near the bottom of Settings
   - Or under Settings > System > Developer options
3. Toggle **Developer options** to **ON**
4. Scroll down in Developer options menu
5. Find **USB debugging**
6. Toggle **USB debugging** to **ON**
7. Tap **OK** on the warning dialog

---

## Step 3: Connect USB Cable

1. Get a USB cable (USB-C or Micro-USB depending on your tablet)
2. Connect one end to your Android tablet
3. Connect the other end to your Mac's USB port

> **Tip**: Use the original cable that came with your tablet for best results. Some cheap cables only support charging, not data transfer.

---

## Step 4: Select USB Mode (if prompted)

When you connect the cable, your tablet may show a notification:

1. Pull down the notification shade
2. Look for **"USB charging this device"** or similar
3. Tap the notification
4. Select **"File Transfer"** or **"MTP"** mode
   - Do NOT select "Charging only"
   - "File Transfer" enables data communication

---

## Step 5: Authorize Your Mac

A popup should appear on your tablet:

**"Allow USB debugging?"**
- Shows your Mac's RSA key fingerprint
- This is a security measure

**What to do**:
1. **Check the box**: "Always allow from this computer" (recommended)
2. Tap **Allow** or **OK**

> **Important**: If you don't see this popup, try unplugging and replugging the USB cable.

---

## Step 6: Verify Connection

On your Mac, open Terminal and run:

```bash
adb devices
```

### Expected Output

**Success** - Device connected:
```
List of devices attached
1234567890ABCDEF    device
```

The device ID (1234567890ABCDEF) is your tablet's serial number.

**Unauthorized** - Need to authorize:
```
List of devices attached
1234567890ABCDEF    unauthorized
```
→ Check your tablet for the authorization popup

**No devices** - Not connected:
```
List of devices attached

```
→ See troubleshooting below

---

## Installing Android Platform Tools

If `adb devices` gives you "command not found", you need to install Android Platform Tools.

### Option 1: Using Homebrew (Recommended)

```bash
brew install android-platform-tools
```

### Option 2: Manual Installation

1. Download from: https://developer.android.com/tools/releases/platform-tools
2. Extract the zip file
3. Add to PATH:
   ```bash
   echo 'export PATH="$HOME/platform-tools:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Verify Installation

```bash
adb --version
```

Should show something like:
```
Android Debug Bridge version 1.0.41
```

---

## Troubleshooting

### Device Shows as "unauthorized"

**Cause**: You haven't authorized the connection on the tablet

**Solution**:
1. Check tablet screen for authorization popup
2. If no popup appears:
   - Unplug and replug USB cable
   - Toggle USB debugging OFF then ON
   - Try revoking authorizations (see below)

### Device Shows as "offline"

**Cause**: Connection issue or previous authorization conflict

**Solution**:
1. Unplug USB cable
2. On tablet: Settings > Developer options > **Revoke USB debugging authorizations**
3. Plug USB cable back in
4. Authorize again when prompted

### No Devices Listed

**Possible causes and solutions**:

**1. USB cable issue**
- Try a different USB cable
- Ensure cable supports data transfer (not charging-only)
- Try a different USB port on your Mac

**2. USB mode incorrect**
- On tablet, pull down notification shade
- Tap USB notification
- Select "File Transfer" or "MTP" mode

**3. USB debugging not enabled**
- Double-check Settings > Developer options > USB debugging is ON

**4. Driver issue (rare on Mac)**
- Restart your Mac
- Restart your tablet
- Try again

**5. adb server issue**
```bash
# Kill and restart adb server
adb kill-server
adb start-server
adb devices
```

### "adb: command not found"

**Cause**: Android Platform Tools not installed

**Solution**: See "Installing Android Platform Tools" section above

### Multiple Devices Connected

If you have multiple Android devices connected:

```bash
# List all devices
adb devices

# Target specific device
adb -s DEVICE_ID install app.apk

# Example
adb -s 1234567890ABCDEF install app-debug.apk
```

---

## Security Notes

### What is the RSA Key Fingerprint?

When you authorize USB debugging, Android shows your Mac's RSA key fingerprint. This ensures you're authorizing the correct computer and not a malicious device.

### "Always allow from this computer"

- **Checked**: Your Mac is permanently authorized (until you revoke)
- **Unchecked**: You'll need to authorize every time you connect

**Recommendation**: Check this box if it's your personal Mac for convenience.

### Revoking Authorizations

To remove all previously authorized computers:

1. Settings > Developer options
2. Scroll down to **Revoke USB debugging authorizations**
3. Tap it
4. All computers will need to be re-authorized

---

## Common ADB Commands

Once connected, here are useful commands:

```bash
# List connected devices
adb devices

# Install an APK
adb install app-debug.apk

# Install and replace existing app
adb install -r app-debug.apk

# Uninstall an app
adb uninstall com.classroomscheduler

# View logs
adb logcat

# Clear logs
adb logcat -c

# Take a screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Reboot device
adb reboot

# Check Android version
adb shell getprop ro.build.version.release
```

---

## Next Steps

Once your device shows as "device" in `adb devices`, you can:

1. **Install the app**:
   ```bash
   cd /Users/jimwilson/ipad-classroom-scheduler/android
   ./gradlew installDebug
   ```

2. **View logs**:
   ```bash
   adb logcat | grep ClassroomScheduler
   ```

3. **Test the app** on your physical tablet

See [TESTING_ON_TABLET.md](TESTING_ON_TABLET.md) for complete testing instructions.

---

## Quick Reference

| Issue | Command |
|-------|---------|
| Check connection | `adb devices` |
| Restart adb | `adb kill-server && adb start-server` |
| Install app | `adb install app.apk` |
| Uninstall app | `adb uninstall com.package.name` |
| View logs | `adb logcat` |
| Clear logs | `adb logcat -c` |

---

## Summary

✅ Enable Developer Options (tap Build number 7 times)  
✅ Enable USB debugging (in Developer options)  
✅ Connect USB cable  
✅ Select "File Transfer" mode  
✅ Authorize your Mac (check "Always allow")  
✅ Verify with `adb devices`  
✅ Install app with `./gradlew installDebug`  

You're now ready to develop and test Android apps on your tablet!
