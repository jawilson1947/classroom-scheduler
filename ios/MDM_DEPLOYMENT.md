# MDM Deployment Guide

## Overview

This guide covers deploying the Classroom Scheduler iOS app via Mobile Device Management (MDM) for enterprise iPad deployments.

## Prerequisites

- MDM solution (Jamf, Intune, Workspace ONE, etc.)
- Apple Developer Enterprise Program or App Store deployment
- iPad devices enrolled in MDM
- Network connectivity for iPads

## Step 1: Prepare the App

### Option A: App Store Deployment

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Submit for review
4. Once approved, note the App Store ID

### Option B: Enterprise Distribution

1. Archive the app in Xcode
2. Export with Enterprise distribution certificate
3. Upload .ipa file to your MDM solution
4. Note the bundle identifier: `com.yourcompany.ClassroomScheduler`

## Step 2: Create Managed App Configuration

Create a configuration profile with the following managed app configuration:

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

### Configuration Keys

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `roomId` | Integer | Room ID to display | `3` |
| `tenantId` | Integer | Organization/tenant ID | `1` |
| `apiBaseURL` | String | API endpoint URL | `https://your-app.vercel.app` |

## Step 3: Configure Single App Mode

### Create Autonomous Single App Mode Profile

1. In your MDM, create a new configuration profile
2. Add **Single App Mode** payload
3. Configure:
   - **Bundle Identifier**: `com.yourcompany.ClassroomScheduler`
   - **Enable Single App Mode**: Yes
   - **Allow Touch**: Yes
   - **Allow Device Rotation**: Yes
   - **Disable Auto-Lock**: Yes

### Additional Settings

```xml
<key>autonomousSingleAppModePermittedAppIDs</key>
<array>
    <string>com.yourcompany.ClassroomScheduler</string>
</array>
```

## Step 4: Create Device Groups

Organize iPads by room assignment:

### Example Groups
- **Computer Room iPads** → roomId: 3
- **Science Lab iPads** → roomId: 5
- **Library iPads** → roomId: 7

## Step 5: Deploy Configuration

### Per-Room Deployment

1. Create separate configuration profiles for each room
2. Assign each profile to the corresponding device group
3. Deploy the app to all iPad groups

### Example: Computer Room

**Profile Name**: `Classroom Scheduler - Computer Room`

**Managed App Config**:
```xml
<dict>
    <key>roomId</key>
    <integer>3</integer>
    <key>tenantId</key>
    <integer>1</integer>
    <key>apiBaseURL</key>
    <string>https://your-production-url.com</string>
</dict>
```

**Assigned To**: Computer Room iPads group

## Step 6: Verify Deployment

### On Each iPad

1. App should install automatically
2. App launches in Single App Mode
3. Display shows correct room name
4. Events load from API
5. Real-time updates work

### Troubleshooting

**App doesn't launch automatically**
- Check MDM deployment status
- Verify iPad is enrolled and connected
- Check app installation logs in MDM

**Wrong room displayed**
- Verify managed app configuration
- Check roomId matches database
- Restart app to reload configuration

**No events showing**
- Check network connectivity
- Verify apiBaseURL is correct
- Test API endpoint manually
- Check tenant_id and room_id in database

**SSE not connecting**
- Verify firewall allows SSE connections
- Check API endpoint is accessible
- Review app logs for connection errors

## Step 7: Maintenance

### Updating Room Assignments

1. Edit the managed app configuration in MDM
2. Change `roomId` value
3. Push update to device
4. App will reload with new configuration

### App Updates

1. Upload new version to App Store or MDM
2. MDM automatically updates devices
3. No reconfiguration needed

### Monitoring

Track in MDM:
- App installation status
- Configuration compliance
- Device check-in status
- Network connectivity

## Advanced Configuration

### Scheduled Updates

Configure MDM to:
- Install app updates during off-hours (e.g., 2 AM)
- Restart devices weekly
- Clear cache monthly

### Network Requirements

**Outbound Connections Required**:
- API endpoint (HTTPS, port 443)
- SSE endpoint (HTTPS, port 443)

**Firewall Rules**:
```
Allow: *.vercel.app (or your domain)
Protocol: HTTPS
Ports: 443
```

### Backup Configuration

Store configuration profiles in version control:

```
mdm-configs/
├── computer-room.mobileconfig
├── science-lab.mobileconfig
└── library.mobileconfig
```

## Security Best Practices

1. ✅ Use HTTPS for all API connections
2. ✅ Restrict API access to known IP ranges
3. ✅ Enable device encryption
4. ✅ Use supervised mode for iPads
5. ✅ Disable unnecessary features (camera, Siri, etc.)
6. ✅ Regular security updates via MDM

## Sample MDM Configurations

### Jamf Pro

1. **Computers → Mobile Devices**
2. **Configuration Profiles → New**
3. **Application & Custom Settings**
4. **Upload plist file**
5. **Scope to device group**

### Microsoft Intune

1. **Apps → iOS/iPadOS**
2. **App configuration policies → Add**
3. **Managed devices**
4. **Configuration settings → Use configuration designer**
5. **Add configuration keys**

### VMware Workspace ONE

1. **Resources → Profiles & Baselines**
2. **Add → Profile → iOS**
3. **Application Configuration**
4. **Add Application**
5. **Configure settings**

## Rollback Plan

If issues occur:

1. **Immediate**: Remove Single App Mode profile
2. **Temporary**: Revert to previous app version
3. **Permanent**: Restore last known good configuration

## Support Checklist

Before contacting support, verify:

- [ ] iPad is enrolled in MDM
- [ ] App is installed and up to date
- [ ] Managed configuration is applied
- [ ] Network connectivity is working
- [ ] API endpoint is accessible
- [ ] Room ID exists in database
- [ ] Tenant ID is correct

## Contact

For deployment assistance:
- Technical Support: [your-support-email]
- MDM Admin: [mdm-admin-email]
- API Issues: [api-support-email]
