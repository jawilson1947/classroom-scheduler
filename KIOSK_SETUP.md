# iPad Kiosk Mode Setup Guide

This guide explains how to configure iPads as dedicated classroom displays using Guided Access (kiosk mode).

---

## Overview

Once an iPad is paired with a room, it will display the current and upcoming events for that room. The iPad "remembers" its configuration using browser localStorage, so it will automatically load the correct room display even after restarts.

---

## Initial Setup Methods

### Method 1: Pairing URL (Recommended)

1. **Generate Pairing URL** (from Admin Dashboard):
   - Navigate to Admin Dashboard → Rooms & Devices
   - Click "🔗 Pairing URL" for the desired room
   - Copy the generated URL (format: `https://your-domain.com/display/pair/{token}`)

2. **Configure iPad**:
   - Open Safari on the iPad
   - Navigate to the pairing URL
   - Wait for "Pairing Successful!" message
   - iPad automatically redirects to `/display/{room_id}`

3. **Note the Room ID**:
   - The URL will now show: `https://your-domain.com/display/{room_id}`
   - Save this room_id for kiosk configuration

### Method 2: Pairing Code

1. **Generate Pairing Code** (from Admin Dashboard):
   - Navigate to Admin Dashboard → Rooms & Devices
   - Click "📱 Pairing Code" for the desired room
   - Note the 6-digit code displayed

2. **Configure iPad**:
   - Open Safari on the iPad
   - Navigate to: `https://your-domain.com/display/setup`
   - Enter the 6-digit pairing code
   - Click "Pair Device"
   - Note the room_id from the resulting URL

---

## Kiosk Mode Configuration

### Step 1: Configure Safari

1. **Open Safari** on the iPad
2. **Navigate to**: `https://your-domain.com/display/{room_id}`
   - Replace `{room_id}` with the actual room ID (e.g., `/display/5`)
3. **Add to Home Screen** (optional but recommended):
   - Tap the Share button
   - Select "Add to Home Screen"
   - Name it (e.g., "Room 101 Display")
   - Tap "Add"

### Step 2: Enable Guided Access

1. **Open Settings** on the iPad
2. Navigate to: **Accessibility → Guided Access**
3. **Enable Guided Access**
4. **Set a Passcode** (you'll need this to exit kiosk mode)
5. **Configure Options**:
   - Enable "Accessibility Shortcut" (optional - allows triple-click to exit)
   - Disable "Touch" if you want to prevent interaction
   - Disable "Motion" if needed

### Step 3: Start Guided Access

1. **Open Safari** (or the Home Screen app if you created one)
2. **Navigate to**: `https://your-domain.com/display/{room_id}`
3. **Triple-click the Side/Home button**
4. **Tap "Start"** in the top-right corner
5. The iPad is now locked to this display

### Step 4: Configure Auto-Lock (Optional)

To keep the display always on:

1. **Settings → Display & Brightness → Auto-Lock**
2. Set to **"Never"**
3. Ensure iPad is plugged into power

---

## How Configuration is Stored

### Browser Storage (PWA)
When paired, the following is stored in Safari's localStorage:
- `room_id` - The room this iPad displays
- `tenant_id` - The organization/tenant
- `device_paired` - Pairing status

This data **persists** even after:
- Closing Safari
- Restarting the iPad
- Clearing browser cache (unless you specifically clear site data)

### What Gets Displayed
The display page (`/display/{room_id}`) shows:
- **Current Event** - Blue gradient with "In Progress..."
- **Upcoming Events** - Standard event cards
- **Past Events** - Green italic text

Events update in real-time via Server-Sent Events (SSE).

---

## Exiting Kiosk Mode

1. **Triple-click** the Side/Home button
2. **Enter the Guided Access passcode**
3. **Tap "End"** in the top-left corner

---

## Troubleshooting

### Display Shows Wrong Room
1. Exit Guided Access
2. Open Safari Developer Tools (if enabled) or clear site data:
   - Settings → Safari → Advanced → Website Data
   - Find your domain and swipe to delete
3. Re-pair using pairing URL or code

### Display Not Updating
1. Check network connection
2. Verify the server is running
3. Refresh the page (exit Guided Access first)
4. Check browser console for errors

### iPad Keeps Sleeping
1. Settings → Display & Brightness → Auto-Lock → Never
2. Ensure iPad is connected to power
3. Check for iOS power-saving restrictions

### Events Not Showing
1. Verify events exist for this room in Admin Dashboard
2. Check that events are scheduled for today
3. Verify room_id in the URL matches the room in Admin Dashboard

---

## MDM Deployment (Advanced)

For enterprise deployments with Mobile Device Management:

### Configuration Profile
You can push configuration via MDM with these keys:
- `roomId` (Integer)
- `tenantId` (Integer)
- `apiBaseURL` (String)

The iOS native app will automatically read these from:
```
com.apple.configuration.managed
```

### Recommended MDM Settings
- **Single App Mode**: Lock to Safari or the native app
- **Web Clip**: Create a home screen icon for the display URL
- **Restrictions**: Disable app installation, Safari settings, etc.
- **Auto-Lock**: Set to "Never"
- **Passcode**: Enforce device passcode for security

---

## Security Considerations

1. **Network Access**: Ensure iPads can reach your server
2. **HTTPS**: Always use HTTPS in production
3. **Passcode**: Set a Guided Access passcode to prevent tampering
4. **Physical Security**: Mount or secure iPads to prevent theft
5. **Auto-Lock**: Balance security vs. always-on display needs

---

## Quick Reference

| Action | URL/Path |
|--------|----------|
| Pairing URL | `https://your-domain.com/display/pair/{token}` |
| Display Page | `https://your-domain.com/display/{room_id}` |
| Manual Setup | `https://your-domain.com/display/setup` |
| Admin Dashboard | `https://your-domain.com/admin` |

**Pairing Token Notes:**
- One-time use only
- Expires in 7 days
- After pairing, use direct `/display/{room_id}` URL

---

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify network connectivity
3. Ensure the server is running and accessible
4. Check Admin Dashboard for correct room configuration
