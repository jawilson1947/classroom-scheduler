# Google Play Publishing Guide

This guide walks you through publishing the Classroom Scheduler Android app to Google Play Console.

## Prerequisites

- Google Play Console account ($25 one-time registration fee)
- App signing key (generated below)
- App screenshots and promotional materials
- Privacy policy URL

## Step 1: Generate Signing Key

Create a keystore file to sign your release builds:

```bash
cd /Users/jimwilson/ipad-classroom-scheduler/android
keytool -genkey -v -keystore classroom-scheduler-release.keystore \
  -alias classroom-scheduler \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**You'll be prompted for:**
- Keystore password (choose a strong password)
- Key password (can be same as keystore password)
- Your name, organization, city, state, country

**⚠️ CRITICAL**: 
- Save the keystore file and passwords securely!
- Store them in a password manager
- Back up the keystore file to a secure location
- If you lose these, you can NEVER update your app again!

## Step 2: Configure Signing

Copy the template and fill in your passwords:

```bash
cp keystore.properties.template keystore.properties
```

Edit `keystore.properties` with your actual passwords:

```properties
storePassword=YOUR_ACTUAL_KEYSTORE_PASSWORD
keyPassword=YOUR_ACTUAL_KEY_PASSWORD
keyAlias=classroom-scheduler
storeFile=classroom-scheduler-release.keystore
```

**Note**: `keystore.properties` is in `.gitignore` and will NOT be committed to git.

## Step 3: Build Release APK/AAB

Google Play requires an **Android App Bundle (.aab)** for new apps:

```bash
cd /Users/jimwilson/ipad-classroom-scheduler/android
./gradlew bundleRelease
```

The signed bundle will be created at:
```
app/build/outputs/bundle/release/app-release.aab
```

**Alternative**: Build a signed APK (for direct distribution or testing):

```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

## Step 4: Prepare Store Listing Materials

Before uploading, prepare these materials:

### Required Assets

1. **App Icon** (512x512 PNG)
   - Use the generated launcher icon or create a high-res version
   
2. **Feature Graphic** (1024x500 PNG)
   - Banner image for Play Store listing
   
3. **Screenshots** (at least 2, up to 8)
   - **Phone**: 320-3840px on short edge
   - **Tablet**: 1200-7680px on short edge
   - Take screenshots of:
     - Configuration screen
     - Event display with current event
     - Event list with upcoming events
     
4. **App Description**
   - Short description (80 characters max)
   - Full description (4000 characters max)
   
5. **Privacy Policy URL**
   - Required for apps that access sensitive data
   - Host at: `https://ipad-scheduler.com/privacy`

### Example Short Description

```
Real-time classroom schedule display for educational institutions with event streaming and MDM support.
```

### Example Full Description

```
Classroom Scheduler is a professional digital signage solution for educational institutions, 
displaying real-time classroom schedules on Android tablets.

KEY FEATURES:
• Real-time event updates via Server-Sent Events (SSE)
• Device pairing with secure token authentication
• Support for recurring events
• Facilitator information with photos and bios
• Rich HTML narrative content display
• Enterprise MDM (Mobile Device Management) support
• Kiosk mode compatible
• Automatic heartbeat monitoring
• Offline fallback with polling

PERFECT FOR:
• Schools and universities
• Conference centers
• Corporate training facilities
• Community centers
• Any facility with scheduled room usage

ENTERPRISE READY:
• Android Enterprise managed configuration
• Remote deployment via MDM
• Centralized management through web admin portal
• Device health monitoring

REQUIREMENTS:
• Android 7.0 (API 24) or higher
• Network connectivity for real-time updates
• Admin account on ipad-scheduler.com for configuration
```

## Step 5: Create App in Google Play Console

1. **Go to**: https://play.google.com/console
2. **Click**: "Create app"
3. **Fill in**:
   - App name: "Classroom Scheduler"
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free
   - Declarations: Check all required boxes
4. **Click**: "Create app"

## Step 6: Complete Store Listing

Navigate to **Store presence > Main store listing**:

1. **App details**:
   - App name: Classroom Scheduler
   - Short description: (from above)
   - Full description: (from above)
   
2. **Graphics**:
   - Upload app icon (512x512)
   - Upload feature graphic (1024x500)
   - Upload screenshots (phone and tablet)
   
3. **Categorization**:
   - App category: Education or Productivity
   - Tags: education, scheduling, digital signage, classroom
   
4. **Contact details**:
   - Email: your-support-email@domain.com
   - Phone: (optional)
   - Website: https://ipad-scheduler.com
   
5. **Privacy Policy**:
   - URL: https://ipad-scheduler.com/privacy

## Step 7: Set Up App Content

Complete all required sections:

### App Access
- Select: "All functionality is available without special access"
- Or describe any restricted features

### Ads
- Select: "No, my app does not contain ads"

### Content Ratings
1. Click "Start questionnaire"
2. Enter your email
3. Select category: "Utility, Productivity, Communication, or Other"
4. Answer questions (all should be "No" for this app)
5. Submit and apply rating

### Target Audience
- Target age: 18+
- Or select appropriate age groups for educational use

### News App
- Select: "No, my app is not a news app"

### Data Safety
1. Click "Start"
2. Answer questions about data collection:
   - Does your app collect or share user data? **No** (app only displays schedules)
   - Or **Yes** if you collect device IDs for tracking
3. Submit

### Government Apps
- Select: "No" (unless applicable)

## Step 8: Select Countries

Navigate to **Production > Countries/regions**:

1. Click "Add countries/regions"
2. Select target countries (e.g., United States, Canada, etc.)
3. Click "Add countries"

## Step 9: Create Release

Navigate to **Production > Releases**:

1. **Click**: "Create new release"
2. **App signing**: 
   - Choose "Google Play App Signing" (recommended)
   - Upload your signing key or let Google generate one
3. **Upload**: 
   - Drag and drop `app-release.aab`
   - Wait for upload and processing
4. **Release name**: "2.5.3" (matches versionName)
5. **Release notes**:
   ```
   Initial release:
   • Real-time classroom schedule display
   • Device pairing with token authentication
   • SSE streaming for instant updates
   • Facilitator information and event narratives
   • Enterprise MDM support
   • Kiosk mode compatible
   ```
6. **Click**: "Save" then "Review release"

## Step 10: Review and Publish

1. **Review** all sections for completeness
2. **Fix** any warnings or errors
3. **Click**: "Start rollout to Production"
4. **Confirm** the release

## Step 11: Wait for Review

- **Review time**: Typically 1-3 days (can be up to 7 days)
- **Status**: Check "Publishing overview" for updates
- **Notifications**: You'll receive emails about review status

## Post-Publication

### Monitor Your App

1. **Statistics**: Track installs, ratings, crashes
2. **Reviews**: Respond to user feedback
3. **Crashes**: Monitor crash reports in Play Console
4. **Updates**: Release updates by creating new releases

### Update Process

When you need to update the app:

1. Increment `versionCode` and `versionName` in `app/build.gradle.kts`
2. Build new AAB: `./gradlew bundleRelease`
3. Create new release in Play Console
4. Upload new AAB
5. Add release notes
6. Submit for review

### Internal Testing (Optional)

Before production release, you can test with internal testers:

1. Navigate to **Testing > Internal testing**
2. Create release
3. Add testers by email
4. Share testing link
5. Get feedback before production

## Troubleshooting

### "App not signed" error
- Ensure `keystore.properties` exists and has correct values
- Verify keystore file path is correct
- Check passwords are correct

### "Version code already used"
- Increment `versionCode` in `app/build.gradle.kts`
- Each release must have a higher version code

### "Missing required fields"
- Complete all sections in "App content"
- Ensure all declarations are checked

### "App rejected"
- Read rejection email carefully
- Fix issues mentioned
- Resubmit for review

## Additional Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Play Console Publishing Guide](https://developer.android.com/distribute/console)

## Security Best Practices

1. **Never commit** `keystore.properties` or `*.keystore` files to git
2. **Backup** your keystore file to multiple secure locations
3. **Use** Google Play App Signing for additional security
4. **Enable** two-factor authentication on your Google Play Console account
5. **Limit** access to signing keys to essential team members only
